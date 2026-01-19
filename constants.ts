
import { Collateral, Policy, Purpose } from './types';

export const NAMES = [
  "John 'The Shark' Doe", "Elena 'Ice' Vorkov", "Sam 'Butterfingers' Higgins",
  "Sarah 'The Saint' Miller", "Bobby 'Big Gains' Malone", "Arthur 'The Oracle' Pendragon",
  "Viktor 'The Wall' Reznov", "Cassandra 'No-Luck' Vane", "Dimitri 'Deep Pockets' Petrov",
  "Lucky 'Unlucky' Luciano", "Misty 'The Ghost' Rivers", "Gus 'The Gear' Grissom"
];

export const COLLATERALS: Collateral[] = [
  { name: "Family Home", value: 350000, isAppreciating: true },
  { name: "2005 Corolla", value: 3200, isAppreciating: false },
  { name: "Private Island", value: 15000000, isAppreciating: true },
  { name: "Gold-Plated Watch", value: 450, isAppreciating: false },
  { name: "Rare Fireflies", value: 25, isAppreciating: false },
  { name: "Luxury Apartment", value: 450000, isAppreciating: true },
  { name: "Vintage Synthohol", value: 1200, isAppreciating: false },
  { name: "Neighbor's Lawnmower", value: 150, isAppreciating: false },
  { name: "Stock Portfolio", value: 25000, isAppreciating: true },
  { name: "Education Degree", value: 100000, isAppreciating: true },
  { name: "Drones", value: 8000, isAppreciating: false },
  { name: "Moon Crater Deed", value: 5000000, isAppreciating: true },
  { name: "Half-Eaten Sandwich", value: 1.5, isAppreciating: false },
  { name: "Magic Beans", value: 1, isAppreciating: false },
  { name: "Signed Photo", value: 50000, isAppreciating: false },
  { name: "Working Toaster", value: 1500, isAppreciating: false }
];

export const PURPOSES: Purpose[] = [
  { label: "Business Startup Fund", isNeed: true, finePrint: "Plan includes sustainable growth metrics." },
  { label: "Emergency Medical Bill", isNeed: true, finePrint: "Critical health necessity." },
  { label: "New Gumball Machine", isNeed: false, finePrint: "Purely for entertainment purposes." },
  { label: "High-Stakes Gambling", isNeed: false, finePrint: "Hidden Clause: 95% chance of total loss." },
  { label: "Technical Certification", isNeed: true, finePrint: "Enhances long-term earning capacity." },
  { label: "World Domination Kit", isNeed: false, finePrint: "Highly unstable ROI." },
  { label: "Rent and Utilities", isNeed: true, finePrint: "Essential cost-of-living support." },
  { label: "Vacation to Mars", isNeed: false, finePrint: "Interest rate spikes to 50% after return." },
  { label: "Repairing Tools", isNeed: true, finePrint: "Maintenance of productive equipment." }
];

export const POLICIES: Policy[] = [
  {
    id: 'austerity',
    title: 'AUSTERITY MEASURE',
    description: 'CREDIT SCORE THRESHOLD INCREASED TO 750.',
    rule: (form) => ({ shouldApprove: form.creditScore >= 750, shouldDeny: form.creditScore < 750 })
  },
  {
    id: 'stimulus',
    title: 'STIMULUS PACKAGE',
    description: 'APPROVE ALL LOANS UNDER $500 REGARDLESS OF SCORE.',
    rule: (form) => form.requestedAmount < 500 ? { shouldApprove: true } : {}
  },
  {
    id: 'asset_back',
    title: 'ASSET BACKING REQ',
    description: 'DENY ANY LOAN WHERE COLLATERAL VALUE < 50% OF LOAN.',
    rule: (form) => form.collateral.value < (form.requestedAmount * 0.5) ? { shouldDeny: true } : {}
  }
];
