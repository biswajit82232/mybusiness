import { useMemo, useState } from "react";
import { num } from "@/domain/index.js";
import { IcPlus, IcUsers } from "@/shared/ui/icons/AppIcons.jsx";
import { EmptyState, TabPageChrome } from "@/shared/ui/layout/AppChrome.jsx";
import { PaginatedVendorList } from "./PaginatedVendorList.jsx";

export function VendorsScreen({ purchases, vendorDirectory, onOpenVendor, onAddVendor, onOpenSidebar }) {
  const [search, setSearch] = useState("");
  const [vendorSort, setVendorSort] = useState("recent");
  const vendors = useMemo(() => {
    const map = new Map();
    for (const p of purchases || []) {
      if (!p || typeof p !== "object") continue;
      const name = (p.supplierName || "").trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (!map.has(key))
        map.set(key, {
          key,
          name,
          phone: "",
          totalPurchases: 0,
          totalOutstanding: 0,
          purchaseCount: 0,
          lastDate: "",
        });
      const c = map.get(key);
      c.totalPurchases += num(p.totalAmount);
      c.totalOutstanding += num(p.outstanding);
      c.purchaseCount++;
      if (!c.lastDate || (p.date && p.date > c.lastDate)) c.lastDate = p.date || c.lastDate;
    }
    for (const d of vendorDirectory || []) {
      if (!d || typeof d !== "object") continue;
      const name = (d.name || "").trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (map.has(key)) continue;
      map.set(key, {
        key,
        name,
        phone: d.phone1 || "",
        totalPurchases: 0,
        totalOutstanding: 0,
        purchaseCount: 0,
        lastDate: d.createdAt || "",
      });
    }
    return Array.from(map.values()).sort((a, b) => {
      const ad = new Date(a.lastDate || 0).getTime();
      const bd = new Date(b.lastDate || 0).getTime();
      if (bd !== ad) return bd - ad;
      return b.totalPurchases - a.totalPurchases;
    });
  }, [purchases, vendorDirectory]);

  const filtered = useMemo(() => {
    if (!search.trim()) return vendors;
    const q = search.toLowerCase();
    return vendors.filter((c) => c.name.toLowerCase().includes(q));
  }, [vendors, search]);

  const sortedFiltered = useMemo(() => {
    if (vendorSort !== "name") return filtered;
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered, vendorSort]);

  return (
    <TabPageChrome
      title="Vendors"
      onOpenSidebar={onOpenSidebar}
      right={<span className="page-hdr-meta">{filtered.length} contacts</span>}
      footer={
        <button type="button" className="fab" onClick={onAddVendor} aria-label="Add vendor">
          <IcPlus />
        </button>
      }
    >
      <div className="sort-bar sort-bar--compact" role="group" aria-label="Sort vendors">
        <span className="sort-bar-lbl">Sort</span>
        <button type="button" className={`sort-chip${vendorSort === "recent" ? " active" : ""}`} onClick={() => setVendorSort("recent")}>
          Recent activity
        </button>
        <button type="button" className={`sort-chip${vendorSort === "name" ? " active" : ""}`} onClick={() => setVendorSort("name")}>
          A–Z
        </button>
      </div>
      <div className="overlay-search-strip">
        <input
          type="search"
          className="search-box overlay-search-strip-input"
          placeholder="Search vendors…"
          aria-label="Search vendors"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="list-area">
        <PaginatedVendorList
          key={`${search}|${vendorSort}|${sortedFiltered.length}`}
          filtered={sortedFiltered}
          alphaHeaders={vendorSort === "name"}
          onOpenVendor={onOpenVendor}
          emptyState={<EmptyState icon={<IcUsers />} title="No vendors yet" />}
        />
      </div>
    </TabPageChrome>
  );
}
