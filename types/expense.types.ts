export interface ReceiptData {
  merchant_name: string;
  date: string;
  time: string;
  total_amount: number;
  category: string;
  payment_method: string;
  items: ReceiptItem[];
  tax_amount?: number;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
}

export interface ExpenseRecord extends ReceiptData {
  receipt_image: any;
  merchant: string;
  total: any;
  id: string;
  image_uri: string;
  created_at: string;
  updated_at: string;
}
