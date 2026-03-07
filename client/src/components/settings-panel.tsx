import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Menu,
  Key,
  Database,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  CreditCard,
  Globe,
  Settings,
  ChevronRight,
  Shield,
} from "lucide-react";

interface StripePK {
  pk: string;
  name: string;
  addedAt: string;
  isDefault: boolean;
}

interface BinDatabase {
  name: string;
  count: number;
  enabled: boolean;
}

export default function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<"pks" | "bins" | "woocommerce">("pks");
  const [stripePKs, setStripePKs] = useState<StripePK[]>([]);
  const [pkCount, setPkCount] = useState(0);
  const [currentPkIndex, setCurrentPkIndex] = useState(0);
  const [newPk, setNewPk] = useState("");
  const [newPkName, setNewPkName] = useState("");
  const [loading, setLoading] = useState(false);
  
  // WooCommerce settings
  const [wooSecretKey, setWooSecretKey] = useState("");
  const [wooSiteUrl, setWooSiteUrl] = useState("");
  const [wooEnabled, setWooEnabled] = useState(false);
  
  // BIN databases
  const [binDatabases, setBinDatabases] = useState<BinDatabase[]>([
    { name: "BINList.net", count: 500000, enabled: true },
    { name: "BINCheck.io", count: 350000, enabled: false },
    { name: "Local Cache", count: 0, enabled: true },
  ]);

  const { toast } = useToast();

  const fetchStripePKs = useCallback(async () => {
    try {
      const resp = await fetch("/api/stripe-pks");
      const data = await resp.json();
      setStripePKs(data.pks || []);
      setPkCount(data.count || 0);
      setCurrentPkIndex(data.currentIndex || 0);
    } catch (err) {
      console.error("Failed to fetch Stripe PKs:", err);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchStripePKs();
    }
  }, [open, fetchStripePKs]);

  const handleAddPK = async () => {
    if (!newPk.trim()) {
      toast({ title: "Error", description: "Please enter a Stripe PK", variant: "destructive" });
      return;
    }
    if (!newPk.startsWith("pk_live_")) {
      toast({ title: "Error", description: "PK must start with pk_live_", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch("/api/stripe-pks/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pk: newPk.trim(), name: newPkName.trim() || "custom" }),
      });
      const data = await resp.json();
      if (data.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Stripe PK added successfully" });
        setNewPk("");
        setNewPkName("");
        fetchStripePKs();
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to add PK", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleRemovePK = async (index: number) => {
    setLoading(true);
    try {
      const resp = await fetch(`/api/stripe-pks/${index}`, { method: "DELETE" });
      const data = await resp.json();
      if (data.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      } else {
        toast({ title: "Removed", description: "Stripe PK removed" });
        fetchStripePKs();
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to remove PK", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleSaveWooCommerce = async () => {
    if (!wooSecretKey.startsWith("sk_live_") && !wooSecretKey.startsWith("sk_test_")) {
      toast({ title: "Error", description: "Secret key must start with sk_live_ or sk_test_", variant: "destructive" });
      return;
    }
    if (!wooSiteUrl.startsWith("http")) {
      toast({ title: "Error", description: "Please enter a valid site URL", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch("/api/woocommerce/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secretKey: wooSecretKey, siteUrl: wooSiteUrl }),
      });
      const data = await resp.json();
      if (data.success) {
        toast({ title: "Success", description: "WooCommerce configuration saved" });
        setWooEnabled(true);
      } else {
        toast({ title: "Error", description: data.error || "Failed to save", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to save configuration", variant: "destructive" });
    }
    setLoading(false);
  };

  const toggleBinDatabase = (index: number) => {
    const newDbs = [...binDatabases];
    newDbs[index].enabled = !newDbs[index].enabled;
    setBinDatabases(newDbs);
    toast({ 
      title: newDbs[index].enabled ? "Enabled" : "Disabled", 
      description: `${newDbs[index].name} ${newDbs[index].enabled ? "enabled" : "disabled"}` 
    });
  };

  const sections = [
    { id: "pks" as const, label: "Stripe PKs", icon: Key, count: pkCount },
    { id: "bins" as const, label: "BIN Databases", icon: Database, count: binDatabases.filter(b => b.enabled).length },
    { id: "woocommerce" as const, label: "WooCommerce", icon: CreditCard, count: wooEnabled ? 1 : 0 },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50"
          data-testid="settings-button"
        >
          <Menu className="h-5 w-5 text-slate-300" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg bg-slate-900 border-slate-700/50 overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-slate-700/50">
          <SheetTitle className="flex items-center gap-2 text-slate-100">
            <Settings className="w-5 h-5 text-blue-400" />
            Settings & Configuration
          </SheetTitle>
        </SheetHeader>

        <div className="py-4 space-y-4">
          {/* Section Tabs */}
          <div className="flex flex-col gap-2">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${
                    isActive
                      ? "bg-blue-600/20 border border-blue-500/30 text-blue-400"
                      : "bg-slate-800/50 border border-slate-700/30 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{section.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                      {section.count}
                    </Badge>
                    <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? "rotate-90" : ""}`} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Stripe PKs Section */}
          {activeSection === "pks" && (
            <Card className="bg-slate-800/30 border-slate-700/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-400" />
                    Stripe Public Keys
                  </span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchStripePKs}>
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-xs text-slate-400 bg-slate-800/50 rounded-lg p-3 border border-slate-700/30">
                  <p className="font-medium text-slate-300 mb-1">How PK Rotation Works:</p>
                  <p>PKs rotate every minute for load balancing. Currently using PK #{currentPkIndex + 1} of {pkCount}.</p>
                </div>

                {/* PK List */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {stripePKs.map((pk, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-2.5 rounded-lg border ${
                        pk.isDefault 
                          ? "bg-blue-500/10 border-blue-500/20" 
                          : "bg-slate-800/50 border-slate-700/30"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-200">{pk.name}</span>
                          {pk.isDefault && (
                            <Badge className="text-[8px] h-4 px-1 bg-blue-500/20 text-blue-400 border-blue-500/30">
                              Default
                            </Badge>
                          )}
                          {idx === currentPkIndex && (
                            <Badge className="text-[8px] h-4 px-1 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                              Active
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] font-mono text-slate-500 truncate">{pk.pk}</p>
                      </div>
                      {!pk.isDefault && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => handleRemovePK(idx - 1)} // -1 because custom PKs start after defaults
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add New PK */}
                <div className="border-t border-slate-700/30 pt-4 space-y-3">
                  <Label className="text-xs text-slate-400">Add New Stripe PK</Label>
                  <Input
                    placeholder="pk_live_..."
                    value={newPk}
                    onChange={(e) => setNewPk(e.target.value)}
                    className="text-xs font-mono bg-slate-800/50 border-slate-700/50"
                  />
                  <Input
                    placeholder="Site name (optional)"
                    value={newPkName}
                    onChange={(e) => setNewPkName(e.target.value)}
                    className="text-xs bg-slate-800/50 border-slate-700/50"
                  />
                  <Button
                    onClick={handleAddPK}
                    disabled={loading || !newPk.trim()}
                    className="w-full h-8 text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Stripe PK
                  </Button>
                </div>

                <div className="text-[10px] text-slate-500 bg-amber-500/5 border border-amber-500/20 rounded-lg p-2">
                  <p className="font-medium text-amber-400 mb-1">💡 How to get PKs:</p>
                  <p>Use the "Grab" feature on any Stripe checkout page to extract its public key, then add it here.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* BIN Databases Section */}
          {activeSection === "bins" && (
            <Card className="bg-slate-800/30 border-slate-700/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Database className="w-4 h-4 text-cyan-400" />
                  BIN Databases
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs text-slate-400 bg-slate-800/50 rounded-lg p-3 border border-slate-700/30">
                  <p>Enable multiple BIN databases for better card identification and bank lookup accuracy.</p>
                </div>

                {binDatabases.map((db, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                      db.enabled
                        ? "bg-emerald-500/10 border-emerald-500/20"
                        : "bg-slate-800/50 border-slate-700/30 hover:border-slate-600/50"
                    }`}
                    onClick={() => toggleBinDatabase(idx)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        db.enabled ? "bg-emerald-500/20" : "bg-slate-700/50"
                      }`}>
                        <Database className={`w-4 h-4 ${db.enabled ? "text-emerald-400" : "text-slate-500"}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-200">{db.name}</p>
                        <p className="text-[10px] text-slate-500">
                          {db.count > 0 ? `${(db.count / 1000).toFixed(0)}K BINs` : "Local storage"}
                        </p>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      db.enabled ? "bg-emerald-500" : "bg-slate-600"
                    }`}>
                      {db.enabled && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                ))}

                <div className="text-[10px] text-slate-500 pt-2">
                  <p>BIN lookup uses multiple sources for comprehensive card information including bank name, card type, and country.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* WooCommerce Section */}
          {activeSection === "woocommerce" && (
            <Card className="bg-slate-800/30 border-slate-700/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-purple-400" />
                    WooCommerce Integration
                  </span>
                  {wooEnabled && (
                    <Badge className="text-[10px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      Configured
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-xs text-slate-400 bg-slate-800/50 rounded-lg p-3 border border-slate-700/30">
                  <p className="font-medium text-slate-300 mb-1">About WooCommerce Integration:</p>
                  <p>Connect your WooCommerce store with Stripe to perform real charge testing. This requires your Stripe secret key.</p>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    <div className="text-[10px] text-amber-200">
                      <p className="font-medium">Security Notice:</p>
                      <p className="text-amber-300/80">Your secret key is stored locally and never sent to external servers. It's used only for direct Stripe API calls.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-slate-400">WooCommerce Site URL</Label>
                    <Input
                      placeholder="https://yourstore.com"
                      value={wooSiteUrl}
                      onChange={(e) => setWooSiteUrl(e.target.value)}
                      className="mt-1 text-xs bg-slate-800/50 border-slate-700/50"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400">Stripe Secret Key</Label>
                    <Input
                      type="password"
                      placeholder="sk_live_... or sk_test_..."
                      value={wooSecretKey}
                      onChange={(e) => setWooSecretKey(e.target.value)}
                      className="mt-1 text-xs font-mono bg-slate-800/50 border-slate-700/50"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Get this from Stripe Dashboard → Developers → API Keys
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleSaveWooCommerce}
                  disabled={loading || !wooSecretKey || !wooSiteUrl}
                  className="w-full h-8 text-xs bg-purple-600 hover:bg-purple-700"
                >
                  <CreditCard className="w-3 h-3 mr-1" />
                  Save & Enable WooCommerce
                </Button>

                {wooEnabled && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <p className="text-xs text-emerald-300">WooCommerce gateway is now available in the checker dropdown.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
