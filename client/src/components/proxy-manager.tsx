import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Shield, Trash2, Loader2, CheckCircle2, XCircle,
  Globe, Wifi, Copy, Check, Fingerprint, RefreshCw,
  Power, Signal, ShieldOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProxyInfo {
  url: string;
  label: string;
  working: boolean;
  lastCheckedIp?: string;
  lastChecked?: string;
  country?: string;
  city?: string;
  isp?: string;
  proxyType?: string; // 'residential', 'mobile', 'datacenter', 'vpn'
  isDefault?: boolean;
}

interface CheckResult {
  working: boolean;
  ip?: string;
  country?: string;
  city?: string;
  isp?: string;
  proxyType?: string;
  message: string;
}

interface FingerprintMeta {
  system: string;
  mac: string;
  deviceName: string;
  concurrency: string;
  memory: string;
  screen: string;
  renderer: string;
  vendor: string;
  canvasHash: string;
  audioHash: string;
  clientRectsHash: string;
  fontHash: string;
  mediaDevices: string;
  speechVoices: string;
  timezone: string;
  language: string;
  dnt: string;
  country: string;
}

function parseProxyInput(input: string): { url?: string; error?: string; host?: string; port?: number; user?: string; pass?: string; hasProtocol?: boolean } {
  input = input.trim();

  // If starts with a scheme, treat as full URL
  const schemeMatch = input.match(/^([a-z0-9+.-]+):\/\//i);
  if (schemeMatch) {
    return { url: input, hasProtocol: true };
  }

  // Accept formats: host:port or host:port:user:pass
  const re = /^(?<host>[^:]+):(?<port>\d{1,5})(?::(?<user>[^:]+):(?<pass>.+))?$/;
  const m = input.match(re);
  if (!m || !m.groups) {
    return { error: 'Invalid format. Use ip:port or ip:port:user:pass or include protocol (e.g. socks5://...)' };
  }

  const host = m.groups.host;
  const port = parseInt(m.groups.port, 10);
  const user = m.groups.user || '';
  const pass = m.groups.pass || '';

  if (!host || isNaN(port) || port < 1 || port > 65535) {
    return { error: 'Invalid host or port number' };
  }

  // Auto-detect protocol based on common ports (used only for building default url)
  let protocol = 'http';
  if (port === 443 || port === 8443) protocol = 'https';
  else if (port === 1080 || port === 9050 || port === 9051) protocol = 'socks5';

  const auth = user && pass ? `${encodeURIComponent(user)}:${encodeURIComponent(pass)}@` : '';
  const url = `${protocol}://${auth}${host}:${port}`;
  return { url, host, port, user, pass, hasProtocol: false };
}

// Try a list of protocols for a given parsed proxy input until one works
async function tryProtocolsForProxy(parsed: ReturnType<typeof parseProxyInput>, checkFn: (url: string) => Promise<CheckResult>, timeout = 8000) {
  if (!parsed) return { working: false, message: 'Invalid proxy' } as CheckResult;

  // If the input already had a protocol, trust that and just check it
  if (parsed.hasProtocol && parsed.url) {
    return await checkFn(parsed.url);
  }

  // Try all protocols in parallel for faster results
  const protocols = ['http', 'https', 'socks5', 'socks4'];
  const auth = parsed.user && parsed.pass ? `${encodeURIComponent(parsed.user)}:${encodeURIComponent(parsed.pass)}@` : '';
  
  const results = await Promise.all(
    protocols.map(async (proto) => {
      const url = `${proto}://${auth}${parsed.host}:${parsed.port}`;
      const res = await checkFn(url);
      return { proto, url, res };
    })
  );

  // Find first working result
  const working = results.find(r => r.res.working);
  if (working) {
    return { ...working.res, message: `${working.res.message} (protocol: ${working.proto})` } as CheckResult;
  }

  return { working: false, message: 'All protocols failed' } as CheckResult;
}

// Simple concurrency runner - increased to 10 for faster parallel processing
async function runWithConcurrency<T, R>(items: T[], worker: (item: T) => Promise<R>, concurrency = 10) {
  const results: R[] = [];
  const executing: Promise<void>[] = [];
  let i = 0;

  async function runOne() {
    while (i < items.length) {
      const idx = i++;
      try {
        const r = await worker(items[idx]);
        results[idx] = r;
      } catch (e) {
        results[idx] = e as any;
      }
    }
  }

  for (let j = 0; j < concurrency; j++) {
    executing.push(runOne());
  }
  await Promise.all(executing);
  return results;
}

export default function ProxyManager() {
  const [proxyInput, setProxyInput] = useState("");
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [checkResults, setCheckResults] = useState<CheckResult[]>([]);
  const [proxies, setProxies] = useState<ProxyInfo[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [proxyEnabled, setProxyEnabled] = useState(true);
  const [fingerprintEnabled, setFingerprintEnabled] = useState(false);
  const [fpMeta, setFpMeta] = useState<FingerprintMeta | null>(null);
  const [fpLoading, setFpLoading] = useState(false);
  const [autoRotation, setAutoRotation] = useState(false);
  const [hiddenProxies, setHiddenProxies] = useState<string[]>([]);
  const [hideProxyList, setHideProxyList] = useState(false);
  const { toast } = useToast();

  // Detect proxy type based on IP data
  const detectProxyType = (isp: string = '', city: string = ''): string => {
    const lowerISP = isp.toLowerCase();
    const lowerCity = city.toLowerCase();
    
    // VPN detection
    if (lowerISP.includes('vpn') || lowerISP.includes('proxyshell') || lowerISP.includes('hide.me')) {
      return 'VPN';
    }
    
    // Mobile detection
    if (lowerISP.includes('mobile') || lowerISP.includes('vodafone') || lowerISP.includes('verizon') || 
        lowerISP.includes('orange') || lowerISP.includes('telefonica') || lowerISP.includes('bell')) {
      return 'Mobile';
    }
    
    // Datacenter detection
    if (lowerISP.includes('aws') || lowerISP.includes('azure') || lowerISP.includes('google cloud') ||
        lowerISP.includes('digital ocean') || lowerISP.includes('linode') || lowerISP.includes('ovh') ||
        lowerISP.includes('hetzner') || lowerISP.includes('vultr') || lowerISP.includes('contabo') ||
        lowerISP.includes('hosting') || lowerISP.includes('datacenter') || lowerISP.includes('server')) {
      return 'Datacenter';
    }
    
    // Default to residential (likely ISP)
    return 'Residential';
  };

  // Check proxy by routing through server (actual proxy check)
  const checkProxyWithMultipleAPIs = useCallback(async (proxyUrl: string, timeout = 8000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Use server endpoint that routes through the proxy
      const resp = await fetch("/api/proxy/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ proxy: proxyUrl }),
      });

      clearTimeout(timeoutId);

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const data = await resp.json();

      if (data.working && data.ip) {
        const isp = data.isp || "Unknown";
        const city = data.city || "Unknown";
        const country = data.country || "Unknown";
        const proxyType = detectProxyType(isp, city);

        return {
          working: true,
          ip: data.ip,
          country: country,
          city: city,
          isp: isp,
          proxyType: proxyType,
          message: `✓ Connected via ${data.ip}`,
        };
      }

      return { 
        working: false, 
        message: data.message || "Proxy check failed" 
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        return { working: false, message: 'Request timeout (>8s)' };
      }
      return { working: false, message: `Error: ${err.message}` };
    }
  }, [detectProxyType]);

  const fetchProxies = useCallback(async () => {
    try {
      const [proxyResp, fpResp] = await Promise.all([
        fetch("/api/proxy/list"),
        fetch("/api/fingerprint/status"),
      ]);
      const proxyData = await proxyResp.json();
      const fpData = await fpResp.json();
      setProxies(proxyData.proxies || []);
      setActiveIndex(proxyData.activeIndex ?? -1);
      setProxyEnabled(proxyData.proxyEnabled !== false);
      setFingerprintEnabled(fpData.enabled || false);
    } catch {}
  }, []);

  useEffect(() => {
    fetchProxies();
  }, [fetchProxies]);

  const refreshFingerprint = useCallback(async () => {
    setFpLoading(true);
    try {
      const resp = await fetch("/api/fingerprint/preview");
      const data = await resp.json();
      setFpMeta(data.meta);
    } catch {}
    setFpLoading(false);
  }, []);

  useEffect(() => {
    if (fingerprintEnabled && !fpMeta) {
      refreshFingerprint();
    }
  }, [fingerprintEnabled, fpMeta, refreshFingerprint]);

  const toggleProxy = useCallback(async (enabled: boolean) => {
    setProxyEnabled(enabled);
    try {
      const resp = await fetch("/api/proxy/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!resp.ok) throw new Error("Server error");
      const data = await resp.json();
      if (!data.success) throw new Error("Toggle failed");
      toast({
        title: enabled ? "Proxy Enabled" : "Proxy Disabled",
        description: enabled ? "Requests will route through proxy" : "Requests will use direct connection",
      });
    } catch {
      setProxyEnabled(!enabled);
      toast({ title: "Error", description: "Failed to toggle proxy", variant: "destructive" });
    }
  }, [toast]);

  const toggleFingerprint = useCallback(async (enabled: boolean) => {
    setFingerprintEnabled(enabled);
    try {
      const resp = await fetch("/api/fingerprint/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!resp.ok) throw new Error("Server error");
      if (enabled) {
        refreshFingerprint();
      } else {
        setFpMeta(null);
      }
      toast({
        title: enabled ? "Fingerprint ON" : "Fingerprint OFF",
        description: enabled
          ? "Auto-randomized per card check, geo-matched to proxy"
          : "Default headers restored",
      });
    } catch {
      setFingerprintEnabled(!enabled);
      toast({ title: "Error", description: "Failed to toggle fingerprint", variant: "destructive" });
    }
  }, [toast, refreshFingerprint]);

  const copyToClipboard = useCallback(async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(key);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch {
      toast({ title: "Copy Failed", variant: "destructive" });
    }
  }, [toast]);

  const handleCheckMultiple = useCallback(async () => {
    const input = proxyInput.trim();
    const rawLines = input.split('\n').map(l => l.trim()).filter(l => l);
    if (rawLines.length === 0) return;

    // Parse and normalize, dedupe by normalized URL when possible
    const parsedList = rawLines.map(line => ({ raw: line, parsed: parseProxyInput(line) }));
    const uniqueMap = new Map<string, { raw: string; parsed: ReturnType<typeof parseProxyInput> }>();
    const errors: { raw: string; message: string }[] = [];
    for (const item of parsedList) {
      if (item.parsed.error) {
        errors.push({ raw: item.raw, message: item.parsed.error });
        continue;
      }
      const key = item.parsed.url || item.raw;
      if (!uniqueMap.has(key)) uniqueMap.set(key, item as any);
    }

    const uniqueItems = Array.from(uniqueMap.values());
    setChecking(true);
    setCheckResults([]);

    // Worker: for each item try protocol fallback (if necessary) using server check
    const worker = async (item: { raw: string; parsed: ReturnType<typeof parseProxyInput> }) => {
      try {
        const res = await tryProtocolsForProxy(item.parsed, (u: string) => checkProxyWithMultipleAPIs(u), 8000);
        const out = { card: item.raw, ...res } as any;
        if (out.working && item.parsed.url) {
          try {
            const addResp = await fetch('/api/proxy/add', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ proxy: item.parsed.url, label: `${out.country || out.ip || 'Proxy'} - ${out.ip || 'Unknown'}`, ip: out.ip, country: out.country, city: out.city, isp: out.isp, proxyType: out.proxyType })
            });
            if (addResp.ok) {
              const addData = await addResp.json();
              setProxies(addData.proxies || []);
            }
          } catch {}
        }
        return out;
      } catch (e: any) {
        return { card: item.raw, working: false, message: e?.message || 'Error' } as any;
      }
    };

    const checked = await runWithConcurrency(uniqueItems, worker, 6);

    const results: CheckResult[] = [];
    // include parse errors first
    for (const e of errors) results.push({ working: false, message: e.message } as any);
    for (const r of checked) results.push(r as any);

    setCheckResults(results as any);
    const workingCount = results.filter((r: any) => r.working).length;

    // Auto-add any working proxies that weren't added during worker (dedupe by normalized URL)
    try {
      const seen = new Set(proxies.map(p => p.url));
      for (const r of results) {
        if (!r.working) continue;
        const raw = (r as any).card || '';
        const parsed = parseProxyInput(raw.trim());
        if (parsed.error || !parsed.url) continue;
        if (seen.has(parsed.url)) continue;
        try {
          const addResp = await fetch('/api/proxy/add', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ proxy: parsed.url, label: `${r.country || r.ip || 'Proxy'} - ${r.ip || 'Unknown'}`, ip: r.ip, country: r.country, city: r.city, isp: r.isp, proxyType: r.proxyType })
          });
          if (addResp.ok) {
            const addData = await addResp.json();
            setProxies(addData.proxies || []);
            // update seen set
            if (addData.proxies) {
              addData.proxies.forEach((p: any) => seen.add(p.url));
            }
          }
        } catch {}
      }
    } catch {}

    // Clear input and results if any proxies were working and added
    if (workingCount > 0) {
      setProxyInput('');
      setCheckResults([]);
      toast({ title: `${workingCount} proxies added`, description: `Successfully added ${workingCount} working proxy(s)` });
    } else {
      toast({ title: `Checked ${results.length} proxies`, description: `No working proxies found`, variant: "destructive" });
    }
    setChecking(false);
  }, [proxyInput, toast, checkProxyWithMultipleAPIs]);

  const handleCheck = useCallback(async () => {
    const input = proxyInput.trim();
    if (!input) {
      toast({ title: "Enter a proxy", description: "Format: ip:port or ip:port:user:pass", variant: "destructive" });
      return;
    }

    // If multiple lines, delegate to the multiple handler
    const lines = input.split('\n').filter(l => l.trim());
    if (lines.length > 1) return handleCheckMultiple();

    const parsed = parseProxyInput(input);
    if (parsed.error) {
      toast({ title: "Invalid Format", description: parsed.error, variant: "destructive" });
      return;
    }

    setChecking(true);
    setCheckResult(null);

    const data = await tryProtocolsForProxy(parsed, (u: string) => checkProxyWithMultipleAPIs(u), 8000);
    setCheckResult(data);

    if (data.working) {
      toast({ title: "Proxy Working", description: `Connected via ${data.ip} (${data.country || "Unknown"})` });
      // Auto-add working proxy to list unless it's already present
      if (parsed.url) {
        if (proxies.some(p => p.url === parsed.url)) {
          toast({ title: "Already Added", description: "This proxy is already in your list", variant: "secondary" });
        } else {
          try {
            const addResp = await fetch('/api/proxy/add', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ proxy: parsed.url, label: `${data.country || data.ip || 'Proxy'} - ${data.ip || 'Unknown'}`, ip: data.ip, country: data.country, city: data.city, isp: data.isp, proxyType: data.proxyType })
            });
            if (addResp.ok) {
              const addData = await addResp.json();
              setProxies(addData.proxies || []);
              // make the newly added proxy active by default
              const idx = addData.proxies?.findIndex((p: any) => p.url === parsed.url) ?? -1;
              if (idx >= 0) {
                setActiveIndex(idx);
                await fetch('/api/proxy/set-active', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ index: idx })
                });
              }
              // clear input / result to avoid duplicate add button
              setProxyInput('');
              setCheckResult(null);
            }
          } catch {}
        }
      }
    } else {
      toast({ title: "Proxy Failed", description: data.message, variant: "destructive" });
    }

    setChecking(false);
  }, [proxyInput, toast, handleCheckMultiple, checkProxyWithMultipleAPIs, proxies]);

  const handleRemove = useCallback(async (index: number) => {
    try {
      const resp = await fetch(`/api/proxy/${index}`, { method: "DELETE" });
      const data = await resp.json();
      if (data.success) {
        setProxies(data.proxies);
        setActiveIndex(data.activeIndex ?? -1);
        toast({ title: "Proxy Removed" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to remove proxy", variant: "destructive" });
    }
  }, [toast]);

  const handleSetActive = useCallback(async (index: number) => {
    const newIdx = index === activeIndex ? -1 : index;
    try {
      await fetch("/api/proxy/set-active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index: newIdx }),
      });
      setActiveIndex(newIdx);
      toast({
        title: newIdx === -1 ? "Round-Robin Mode" : "Active Proxy Set",
        description: newIdx === -1 ? "Will rotate through all working proxies" : `Using: ${proxies[newIdx]?.label}`,
      });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  }, [activeIndex, proxies, toast]);

  const handleDeleteProxy = useCallback((proxyUrl: string) => {
    const newHidden = [...hiddenProxies, proxyUrl];
    setHiddenProxies(newHidden);
    localStorage.setItem('hidden_proxies', JSON.stringify(newHidden));
    toast({ title: "Proxy Hidden", description: "Will reappear after page reload" });
  }, [hiddenProxies, toast]);

  // Load hidden proxies from localStorage on mount
  useEffect(() => {
    const hidden = localStorage.getItem('hidden_proxies');
    if (hidden) {
      try {
        setHiddenProxies(JSON.parse(hidden));
      } catch {}
    }
  }, []);

  const workingCount = proxies.filter(p => p.working).length;

  return (
    <div className="space-y-3" data-testid="section-proxy-manager">
      {/* ===== PROXY SECTION ===== */}
      <Card className={`transition-all ${!proxyEnabled ? "opacity-75" : ""}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`p-1.5 rounded-lg ${proxyEnabled ? "bg-emerald-500/10" : "bg-muted"}`}>
                {proxyEnabled ? (
                  <Shield className="w-4 h-4 text-emerald-500" />
                ) : (
                  <ShieldOff className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Proxy</CardTitle>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {proxyEnabled ? (
                    workingCount > 0 ? `${workingCount} proxy active` : "No working proxy"
                  ) : "Direct connection"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {proxyEnabled && proxies.length > 0 && (
                <Badge className={`text-[10px] ${workingCount > 0 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                  {workingCount}/{proxies.length}
                </Badge>
              )}
              <div className="flex items-center gap-1.5" data-testid="toggle-proxy-wrapper">
                <Power className={`w-3.5 h-3.5 transition-colors ${proxyEnabled ? "text-emerald-500" : "text-muted-foreground"}`} />
                <Switch
                  checked={proxyEnabled}
                  onCheckedChange={toggleProxy}
                  data-testid="toggle-proxy"
                />
              </div>
            </div>
          </div>
        </CardHeader>

        {proxyEnabled && (
          <CardContent className="space-y-3 pt-0">
            {/* Proxy Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Proxy Input (one per line)</Label>
                <div className="flex items-center gap-3">
                  <label className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={autoRotation}
                      onChange={(e) => setAutoRotation(e.target.checked)}
                      className="w-3 h-3 rounded"
                    />
                    Auto Rotate
                  </label>
                  <label className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={hideProxyList}
                      onChange={(e) => setHideProxyList(e.target.checked)}
                      className="w-3 h-3 rounded"
                    />
                    Hide Proxy List
                  </label>
                </div>
              </div>
              <textarea
                data-testid="input-proxy"
                value={proxyInput}
                onChange={(e) => { setProxyInput(e.target.value); setCheckResult(null); setCheckResults([]); }}
                placeholder="192.168.1.1:8080&#10;192.168.1.1:8080:user:pass&#10;10.0.0.1:1080&#10;(auto-detects protocol based on port)"
                className="w-full min-h-20 rounded-md border border-input bg-background px-3 py-2 text-xs font-mono shadow-sm placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                disabled={checking}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleCheck}
                disabled={checking || !proxyInput.trim()}
                data-testid="button-check-proxy"
                className="w-full h-8 text-xs"
              >
                {checking ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Wifi className="w-3 h-3 mr-1" />}
                {proxyInput.trim().split('\n').filter(l => l.trim()).length > 1 ? "Check All" : "Check"}
              </Button>
            </div>

            {/* Multi-Check Results - Only shows if there are failed proxies */}
            {checkResults.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Results ({checkResults.filter(r => r.working).length}/{checkResults.length} working - auto-added)
                  </p>
                  <Button size="sm" variant="ghost" onClick={() => setCheckResults([])} className="h-6 text-[10px] px-2">
                    Clear Results
                  </Button>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {checkResults.map((result, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start gap-2 rounded px-2 py-1.5 ${
                        result.working
                          ? "bg-emerald-500/8 border border-emerald-500/15"
                          : "bg-red-500/8 border border-red-500/15"
                      }`}
                    >
                      {result.working ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-mono text-muted-foreground truncate">{result.card}</p>
                        <p className={`text-[9px] ${result.working ? "text-emerald-600" : "text-red-600"}`}>
                          {result.working ? "✓ Working" : result.message || "Failed"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {checkResult && (
              <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${
                checkResult.working ? "bg-emerald-500/5 border border-emerald-500/15" : "bg-destructive/5 border border-destructive/15"
              }`}>
                {checkResult.working ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${checkResult.working ? "text-emerald-500" : "text-destructive"}`}>
                    {checkResult.working ? "Proxy Working - Auto Added!" : "Proxy Failed"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{checkResult.message}</p>
                  {checkResult.working && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {checkResult.ip && (
                        <Badge variant="outline" className="text-[9px] gap-0.5 font-mono h-5 px-1.5">
                          <Globe className="w-2 h-2" />{checkResult.ip}
                        </Badge>
                      )}
                      {checkResult.country && (
                        <Badge variant="outline" className="text-[9px] h-5 px-1.5">{checkResult.country}</Badge>
                      )}
                      {checkResult.city && (
                        <Badge variant="outline" className="text-[9px] h-5 px-1.5">{checkResult.city}</Badge>
                      )}
                      {checkResult.proxyType && (
                        <Badge className={`text-[9px] h-5 px-1.5 font-semibold ${
                          checkResult.proxyType === 'Residential' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                          checkResult.proxyType === 'Mobile' ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' :
                          checkResult.proxyType === 'Datacenter' ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' :
                          'bg-cyan-500/10 text-cyan-600 border-cyan-500/20'
                        }`}>{checkResult.proxyType}</Badge>
                      )}
                      {checkResult.isp && (
                        <Badge variant="secondary" className="text-[9px] h-5 px-1.5">{checkResult.isp}</Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {proxies.length > 0 && !hideProxyList && (
              <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-2">
                {proxies.filter(p => !hiddenProxies.includes(p.url)).map((p, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSetActive(idx)}
                    className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 group transition-all cursor-pointer ${
                      activeIndex === idx
                        ? "bg-emerald-500/15 border border-emerald-500/30 shadow-md ring-2 ring-emerald-500/10"
                        : p.isDefault
                          ? "bg-gradient-to-r from-indigo-500/8 to-purple-500/8 border border-indigo-500/15 hover:border-indigo-500/30"
                          : "bg-accent/40 border border-transparent hover:border-border/50"
                    }`}
                    data-testid={`row-proxy-${idx}`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                      <div className="flex items-center gap-1.5 shrink-0">
                        {p.working ? (
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                          </span>
                        ) : (
                          <span className="relative flex h-2 w-2">
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`text-xs font-semibold truncate block ${activeIndex === idx ? 'text-emerald-500' : ''}`}>{p.label}</span>
                        {p.ip && <span className="text-[10px] text-muted-foreground font-mono">{p.ip}</span>}
                      </div>
                      {p.isDefault && (
                        <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-[8px] h-4 px-1.5 shrink-0">Default</Badge>
                      )}
                      {p.country && (
                        <Badge variant="outline" className="text-[8px] h-4 px-1.5 shrink-0">{p.country}</Badge>
                      )}
                      {p.city && (
                        <Badge variant="outline" className="text-[8px] h-4 px-1.5 shrink-0">{p.city}</Badge>
                      )}
                      {p.isp && (
                        <Badge variant="secondary" className="text-[8px] h-4 px-1.5 shrink-0 max-w-xs truncate">{p.isp}</Badge>
                      )}
                      {p.proxyType && (
                        <Badge className={`text-[8px] h-4 px-1.5 shrink-0 font-semibold ${
                          p.proxyType === 'Residential' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                          p.proxyType === 'Mobile' ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' :
                          p.proxyType === 'Datacenter' ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' :
                          'bg-cyan-500/10 text-cyan-600 border-cyan-500/20'
                        }`}>{p.proxyType}</Badge>
                      )}
                      {activeIndex === idx && (
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[8px] h-4 px-1.5 shrink-0">
                          <Signal className="w-2 h-2 mr-0.5" />Active
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => copyToClipboard(p.url, `proxy-${idx}`)}
                      >
                        {copiedIndex === `proxy-${idx}` ? (
                          <Check className="w-2.5 h-2.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-2.5 h-2.5" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-destructive/60 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => p.isDefault ? handleDeleteProxy(p.url) : handleRemove(idx)}
                        data-testid={`button-remove-proxy-${idx}`}
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* ===== FINGERPRINT SECTION ===== */}
      <Card className={`transition-all ${!fingerprintEnabled ? "opacity-75" : ""}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`p-1.5 rounded-lg ${fingerprintEnabled ? "bg-violet-500/10" : "bg-muted"}`}>
                <Fingerprint className={`w-4 h-4 transition-colors ${fingerprintEnabled ? "text-violet-500" : "text-muted-foreground"}`} />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Fingerprint Spoof</CardTitle>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {fingerprintEnabled ? "Identity randomized per request" : "Default browser identity"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5" data-testid="toggle-fingerprint-wrapper">
              <Switch
                checked={fingerprintEnabled}
                onCheckedChange={toggleFingerprint}
                data-testid="toggle-fingerprint"
              />
            </div>
          </div>
        </CardHeader>

        {fingerprintEnabled && (
          <CardContent className="pt-0">
            <div className="rounded-lg bg-violet-500/5 border border-violet-500/10 px-3 py-2.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-medium text-violet-400 flex items-center gap-1">
                  <Fingerprint className="w-3 h-3" /> Current Identity
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={refreshFingerprint}
                  disabled={fpLoading}
                  className="h-5 text-[10px] px-1.5 text-violet-400 hover:text-violet-300"
                >
                  <RefreshCw className={`w-2.5 h-2.5 mr-0.5 ${fpLoading ? "animate-spin" : ""}`} />
                  Preview
                </Button>
              </div>
              {fpMeta && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                  <FpRow label="OS" value={fpMeta.system} />
                  <FpRow label="Screen" value={fpMeta.screen} />
                  <FpRow label="Device" value={fpMeta.deviceName} mono />
                  <FpRow label="MAC" value={fpMeta.mac} mono />
                  <FpRow label="Timezone" value={fpMeta.timezone} />
                  <FpRow label="Language" value={fpMeta.language} />
                  <FpRow label="GPU" value={fpMeta.renderer} />
                  <FpRow label="Cores" value={fpMeta.concurrency} />
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

function FpRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className="text-[9px] text-muted-foreground shrink-0">{label}</span>
      <span className={`text-[9px] truncate text-right max-w-[140px] ${mono ? "font-mono" : "font-medium"}`}>{value}</span>
    </div>
  );
}
