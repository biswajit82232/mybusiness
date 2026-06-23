import { useMemo, useState } from "react";
import { num } from "@/domain/index.js";
import { IcPlus, IcUsers } from "@/shared/ui/icons/AppIcons.jsx";
import { EmptyState, TabPageChrome } from "@/shared/ui/layout/AppChrome.jsx";
import { PaginatedCustomerList } from "./PaginatedCustomerList.jsx";

export function CustomersScreen({ sales = [], customerDirectory = [], onOpenCustomer, onAddCustomer, onOpenSidebar }) {
  const [search, setSearch] = useState("");
  const [customerSort, setCustomerSort] = useState("recent");
  const customers = useMemo(() => {
    const map = new Map();
    for (const s of sales) {
      if (!s || typeof s !== "object") continue;
      const name = (s.customerName || "").trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (!map.has(key)) map.set(key, { key, name, phone: s.phone || s.customerNo1 || "", totalRevenue: 0, totalOutstanding: 0, salesCount: 0, lastDate: "" });
      const c = map.get(key);
      c.totalRevenue += num(s.totalSale);
      c.totalOutstanding += num(s.outstanding);
      c.salesCount++;
      if (!c.lastDate || (s.date && s.date > c.lastDate)) c.lastDate = s.date || c.lastDate;
      if (!c.phone) c.phone = s.phone || s.customerNo1 || "";
    }
    for (const d of customerDirectory || []) {
      if (!d || typeof d !== "object") continue;
      const name = (d.name || "").trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (map.has(key)) continue;
      map.set(key, {
        key,
        name,
        phone: d.customerNo1 || "",
        totalRevenue: 0,
        totalOutstanding: 0,
        salesCount: 0,
        lastDate: d.createdAt || "",
      });
    }
    return Array.from(map.values()).sort((a, b) => {
      const ad = new Date(a.lastDate || 0).getTime();
      const bd = new Date(b.lastDate || 0).getTime();
      if (bd !== ad) return bd - ad;
      return b.totalRevenue - a.totalRevenue;
    });
  }, [sales, customerDirectory]);

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter((c) => c.name.toLowerCase().includes(q));
  }, [customers, search]);

  const sortedFiltered = useMemo(() => {
    if (customerSort !== "name") return filtered;
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered, customerSort]);

  return (
    <TabPageChrome
      title="Customers"
      onOpenSidebar={onOpenSidebar}
      right={<span className="page-hdr-meta">{filtered.length} contacts</span>}
      footer={
        <button type="button" className="fab" onClick={onAddCustomer} aria-label="Add customer">
          <IcPlus />
        </button>
      }
    >
      <div className="sort-bar sort-bar--compact" role="group" aria-label="Sort customers">
        <span className="sort-bar-lbl">Sort</span>
        <button type="button" className={`sort-chip${customerSort === "recent" ? " active" : ""}`} onClick={() => setCustomerSort("recent")}>
          Recent activity
        </button>
        <button type="button" className={`sort-chip${customerSort === "name" ? " active" : ""}`} onClick={() => setCustomerSort("name")}>
          A–Z
        </button>
      </div>
      <div className="overlay-search-strip">
        <input
          type="search"
          className="search-box overlay-search-strip-input"
          placeholder="Search customers…"
          aria-label="Search customers"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="list-area">
        <PaginatedCustomerList
          key={`${search}|${customerSort}|${sortedFiltered.length}`}
          filtered={sortedFiltered}
          alphaHeaders={customerSort === "name"}
          onOpenCustomer={onOpenCustomer}
          emptyState={<EmptyState icon={<IcUsers />} title="No customers yet" />}
        />
      </div>
    </TabPageChrome>
  );
}
