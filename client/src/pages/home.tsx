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
      <div className="relative overflow-hidden border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-l from-indigo-500/10 to-transparent rounded-full blur-3xl" />
        <div className="relative max-w-4xl mx-auto px-4 py-8 sm:py-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent" data-testid="text-title">
                CC Toolkit
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Advanced card & BIN analysis</p>
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
                  className={`relative flex flex-col items-center gap-1.5 rounded-xl px-4 py-3 sm:py-4 text-center transition-all cursor-pointer border backdrop-blur-sm ${
                    isActive
                      ? "bg-gradient-to-br from-indigo-500 to-purple-500 text-white border-indigo-400/50 shadow-lg shadow-indigo-500/30"
                      : "bg-card/50 text-muted-foreground border-border/40 hover:bg-card hover:text-foreground hover:border-border/60"
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
                  <Icon className="w-5 h-5 relative z-10" />
                  <span className="text-xs sm:text-sm font-semibold leading-tight relative z-10">{tab.label}</span>
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
