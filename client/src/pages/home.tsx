import { useState, Suspense, lazy } from "react";
import { CreditCard, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// lazy load to make initial bundle smaller and speed up UI start
const BinExtrap = lazy(() => import("@/components/bin-extrap"));
const CardChecker = lazy(() => import("@/components/card-checker"));

const tabs = [
  { id: "extrap", label: "Bin Extrap", icon: Zap, description: "Find patterns by comparing cards" },
  { id: "cards", label: "Cards Gen & Check", icon: CreditCard, description: "Generate and check cards" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("cards");

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-blue-900/30 bg-gradient-to-r from-slate-900/90 via-blue-950/80 to-slate-900/90 backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-cyan-500/5 rounded-full blur-3xl" />
        
        <div className="relative max-w-4xl mx-auto px-4 py-8 sm:py-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25 border border-blue-400/20">
              <Zap className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gradient" data-testid="text-title">
                CC Toolkit
              </h1>
              <p className="text-sm text-slate-400 mt-1 font-medium">Advanced card & BIN analysis</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4" data-testid="tab-bar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative flex flex-col items-center gap-2 rounded-xl px-4 py-4 sm:py-5 text-center transition-all cursor-pointer border ${
                    isActive
                      ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white border-blue-500/50 shadow-lg shadow-blue-600/30"
                      : "bg-slate-900/50 text-slate-400 border-slate-700/50 hover:bg-slate-800/50 hover:text-slate-200 hover:border-slate-600/50"
                  }`}
                  data-testid={`tab-${tab.id}`}
                >
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-xl"
                      layoutId="activeTab"
                      initial={false}
                    />
                  )}
                  <Icon className={`w-5 h-5 relative z-10 ${isActive ? 'text-white' : 'text-blue-400'}`} />
                  <span className="text-sm font-semibold leading-tight relative z-10">{tab.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-10">
        <Suspense fallback={<div className="py-20 text-center text-muted-foreground">Loading…</div>}>
          <div className="mx-auto w-full max-w-2xl">
            {/* keep both mounted and hide/show so their state persists */}
            <div className={activeTab === "cards" ? "block" : "hidden"}>
              <motion.div
                key="cards"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: activeTab === "cards" ? 1 : 0, y: activeTab === "cards" ? 0 : 8 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <CardChecker />
              </motion.div>
            </div>
            <div className={activeTab === "extrap" ? "block" : "hidden"}>
              <motion.div
                key="extrap"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: activeTab === "extrap" ? 1 : 0, y: activeTab === "extrap" ? 0 : 8 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <BinExtrap />
              </motion.div>
            </div>
          </div>
        </Suspense>
      </div>
    </div>
  );
}
