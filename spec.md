# Safentry v79 - Badge Inventory, Satisfaction Trend, Blacklist Taxonomy

## Current State
- CompanyDashboard.tsx has 16169 lines with many feature tabs
- Blacklist tab already has `reasonCategory` field with limited categories: Güvenlik Tehdidi, Yasak Kişi, Eski Çalışan, Hırsızlık, Diğer
- Satisfaction trend exists in Stats tab as inline section but no dedicated standalone tab
- No physical badge/card inventory management system exists
- BlacklistEntry type already has optional `reasonCategory?: string`

## Requested Changes (Diff)

### Add
1. **BadgeInventoryTab component** - New tab `badgeinventory` in CompanyDashboard:
   - Track physical badge/card stock: define total count, cards issued to active visitors, returned count
   - Add/remove card entries with serial number, assigned visitor, issue date
   - Low stock warning when available < 10
   - Stats cards: Toplam Kart, Zimmetli, İade Edildi, Müsait
   - Table of issued cards with visitor name, card serial, issue date, return action

2. **SatisfactionTrendTab component** - New tab `satisfactiontrend` in CompanyDashboard:
   - Dedicated time-series trend panel showing weekly satisfaction averages
   - Bar/line chart built with SVG showing last 8 weeks of avg satisfaction scores
   - Automatic alert banner when current week average drops >0.5 points vs previous week
   - Category breakdown: how each visitor category scores over time
   - Period selector: last 4 weeks / 8 weeks / 3 months

3. **Blacklist category taxonomy enhancement** in the existing blacklist tab:
   - Expand categories to: Güvenlik Tehdidi, Saldırgan Davranış, Hırsızlık, Politika İhlali, Eski Çalışan, Sahte Kimlik, Yasak Kişi, Diğer
   - Add category statistics panel above the blacklist: pie-chart style count breakdown per category
   - Add category filter buttons to filter the blacklist list by category
   - Color code each category with distinct colors

### Modify
- CompanyDashboard.tsx: add `badgeinventory` and `satisfactiontrend` tabs to tab rendering and tab navigation menu
- Blacklist section: add category stats panel, category filter, expanded category options

### Remove
- Nothing removed

## Implementation Plan
1. Create `BadgeInventoryTab` component inline in CompanyDashboard (or separate file)
2. Create `SatisfactionTrendTab` component inline in CompanyDashboard
3. Update blacklist section: expand categories dropdown, add stats breakdown panel, add filter
4. Register both new tabs in the tab navigation menu (with icons 🪪 and 📊)
5. Add tab rendering cases for both new tabs
