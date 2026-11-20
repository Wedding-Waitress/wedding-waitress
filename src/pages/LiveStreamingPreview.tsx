import React, { useState } from "react";
import { Radio, LockKeyhole } from "lucide-react";
import { LiveStreamingPage } from "@/components/Dashboard/LiveStreaming/LiveStreamingPage";
import { productNavigationItems } from "@/config/productNavigation";
import {
  PLANNING_WORKFLOW_IDS,
  PLANNING_WORKFLOW_STEPS,
} from "@/config/planningWorkflow";
import { SeoHead } from "@/components/SEO/SeoHead";
import logo from "@/assets/wedding-waitress-full-logo.png";
import styles from "@/components/Dashboard/LiveStreaming/LiveStreamingPage.module.css";

/** Owner review entry only: excluded from production routing. No account access is granted. */
export default function LiveStreamingPreview() {
  const [streamingOnly, setStreamingOnly] = useState(false);
  const items = [
    ...PLANNING_WORKFLOW_STEPS,
    ...productNavigationItems
      .filter((p) => !PLANNING_WORKFLOW_IDS.has(p.sidebarId))
      .map((p) => ({ id: p.sidebarId, label: p.sidebarLabel, icon: p.icon })),
  ];
  if (!import.meta.env.DEV) return null;
  return (
    <div className={styles.shell}>
      <SeoHead
        title="Live Streaming Design Preview | Wedding Waitress"
        description="Private local interface review. No live service or payments."
        noIndex
      />
      <aside
        className={styles.sidebar}
        aria-label="Dashboard navigation preview"
      >
        <img src={logo} alt="Wedding Waitress" />
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              disabled={streamingOnly}
              title={
                streamingOnly
                  ? "Planning package required"
                  : "Existing dashboard page"
              }
              onClick={() => {
                window.location.href = `/dashboard?tab=${encodeURIComponent(item.id)}`;
              }}
            >
              <Icon />
              {item.label}
              {streamingOnly && <LockKeyhole size={12} />}
            </button>
          );
        })}
        <button aria-current="page">
          <Radio />
          Live Streaming
        </button>
        <small>Owner preview settings</small>
        <label>
          Account access preview
          <select
            aria-label="Account access preview"
            value={streamingOnly ? "streaming" : "planning"}
            onChange={(e) => setStreamingOnly(e.target.value === "streaming")}
          >
            <option value="planning">Planning + Streaming</option>
            <option value="streaming">Live Streaming only</option>
          </select>
        </label>
        <p className={styles.shellFooter}>
          Design review only
          <br />
          No customer account is changed.
        </p>
      </aside>
      <main className={styles.shellMain}>
        <div className={styles.shellTop}>
          <span>Wedding Waitress / Live Streaming / Design review</span>
          <a href="/dashboard">Open existing dashboard</a>
          <label className={styles.mobileNav}>
            Account preview
            <select
              aria-label="Mobile account access preview"
              value={streamingOnly ? "streaming" : "planning"}
              onChange={(e) => setStreamingOnly(e.target.value === "streaming")}
            >
              <option value="planning">Planning + Streaming</option>
              <option value="streaming">Live Streaming only</option>
            </select>
          </label>
        </div>
        <LiveStreamingPage />
      </main>
    </div>
  );
}
