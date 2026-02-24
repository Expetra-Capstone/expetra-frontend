// --- Interfaces ---
export interface StatusOption {
  id: string;
  name: string;
}

export interface FilterState {
  selectedCategory: string;
  selectedStatus: string;
  selectedFilter: "all" | "deposits" | "withdrawals";
}
