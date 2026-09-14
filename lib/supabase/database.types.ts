export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          currency: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workspaces: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          slug: string;
          type: "home" | "shop";
          icon: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          slug: string;
          type: "home" | "shop";
          icon?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          slug?: string;
          type?: "home" | "shop";
          icon?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          workspace_id: string;
          name: string;
          type: "income" | "expense";
          icon: string | null;
          is_default: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          workspace_id: string;
          name: string;
          type: "income" | "expense";
          icon?: string | null;
          is_default?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          workspace_id?: string;
          name?: string;
          type?: "income" | "expense";
          icon?: string | null;
          is_default?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categories_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          }
        ];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          workspace_id: string;
          category_id: string | null;
          type: "income" | "expense";
          name: string;
          amount: number;
          payment_method: string | null;
          transaction_date: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          workspace_id: string;
          category_id?: string | null;
          type: "income" | "expense";
          name: string;
          amount: number;
          payment_method?: string | null;
          transaction_date: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          workspace_id?: string;
          category_id?: string | null;
          type?: "income" | "expense";
          name?: string;
          amount?: number;
          payment_method?: string | null;
          transaction_date?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "categories";
            referencedColumns: ["id"];
          }
        ];
      };
      debts: {
        Row: {
          id: string;
          user_id: string;
          workspace_id: string;
          direction: "borrowed" | "lent";
          person_name: string;
          phone: string | null;
          original_amount: number;
          debt_date: string;
          due_date: string | null;
          notes: string | null;
          status: "unpaid" | "partial" | "paid" | "overdue";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          workspace_id: string;
          direction: "borrowed" | "lent";
          person_name: string;
          phone?: string | null;
          original_amount: number;
          debt_date?: string;
          due_date?: string | null;
          notes?: string | null;
          status?: "unpaid" | "partial" | "paid" | "overdue";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          workspace_id?: string;
          direction?: "borrowed" | "lent";
          person_name?: string;
          phone?: string | null;
          original_amount?: number;
          debt_date?: string;
          due_date?: string | null;
          notes?: string | null;
          status?: "unpaid" | "partial" | "paid" | "overdue";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "debts_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          }
        ];
      };
      debt_payments: {
        Row: {
          id: string;
          user_id: string;
          debt_id: string;
          amount: number;
          payment_date: string;
          payment_method: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          debt_id: string;
          amount: number;
          payment_date: string;
          payment_method?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          debt_id?: string;
          amount?: number;
          payment_date?: string;
          payment_method?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "debt_payments_debt_id_fkey";
            columns: ["debt_id"];
            referencedRelation: "debts";
            referencedColumns: ["id"];
          }
        ];
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          workspace_id: string;
          category_id: string | null;
          month: string;
          amount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          workspace_id: string;
          category_id?: string | null;
          month: string;
          amount: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          workspace_id?: string;
          category_id?: string | null;
          month?: string;
          amount?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "budgets_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "budgets_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "categories";
            referencedColumns: ["id"];
          }
        ];
      };
      daily_sales: {
        Row: {
          id: string;
          user_id: string;
          workspace_id: string;
          sale_date: string;
          cash_amount: number;
          upi_amount: number;
          card_amount: number;
          other_amount: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          workspace_id: string;
          sale_date: string;
          cash_amount?: number;
          upi_amount?: number;
          card_amount?: number;
          other_amount?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          workspace_id?: string;
          sale_date?: string;
          cash_amount?: number;
          upi_amount?: number;
          card_amount?: number;
          other_amount?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_sales_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          }
        ];
      };
      suppliers: {
        Row: {
          id: string;
          user_id: string;
          workspace_id: string;
          name: string;
          phone: string | null;
          email: string | null;
          address: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          workspace_id: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          workspace_id?: string;
          name?: string;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "suppliers_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          }
        ];
      };
      purchases: {
        Row: {
          id: string;
          user_id: string;
          workspace_id: string;
          supplier_id: string | null;
          bill_number: string | null;
          purchase_date: string;
          total_amount: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          workspace_id: string;
          supplier_id?: string | null;
          bill_number?: string | null;
          purchase_date: string;
          total_amount: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          workspace_id?: string;
          supplier_id?: string | null;
          bill_number?: string | null;
          purchase_date?: string;
          total_amount?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "purchases_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchases_supplier_id_fkey";
            columns: ["supplier_id"];
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          }
        ];
      };
      supplier_payments: {
        Row: {
          id: string;
          user_id: string;
          workspace_id: string;
          supplier_id: string;
          purchase_id: string | null;
          amount: number;
          payment_date: string;
          payment_method: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          workspace_id: string;
          supplier_id: string;
          purchase_id?: string | null;
          amount: number;
          payment_date: string;
          payment_method?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          workspace_id?: string;
          supplier_id?: string;
          purchase_id?: string | null;
          amount?: number;
          payment_date?: string;
          payment_method?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "supplier_payments_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey";
            columns: ["supplier_id"];
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "supplier_payments_purchase_id_fkey";
            columns: ["purchase_id"];
            referencedRelation: "purchases";
            referencedColumns: ["id"];
          }
        ];
      };
      products: {
        Row: {
          id: string;
          user_id: string;
          workspace_id: string;
          name: string;
          category: string | null;
          unit: string | null;
          purchase_price: number | null;
          selling_price: number | null;
          current_stock: number;
          low_stock_threshold: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          workspace_id: string;
          name: string;
          category?: string | null;
          unit?: string | null;
          purchase_price?: number | null;
          selling_price?: number | null;
          current_stock?: number;
          low_stock_threshold?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          workspace_id?: string;
          name?: string;
          category?: string | null;
          unit?: string | null;
          purchase_price?: number | null;
          selling_price?: number | null;
          current_stock?: number;
          low_stock_threshold?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          }
        ];
      };
      inventory_movements: {
        Row: {
          id: string;
          user_id: string;
          workspace_id: string;
          product_id: string;
          movement_type:
            | "purchase"
            | "sale"
            | "adjustment_in"
            | "adjustment_out"
            | "opening_stock"
            | "return_in"
            | "return_out";
          quantity: number;
          unit_cost: number | null;
          reference_type: string | null;
          reference_id: string | null;
          notes: string | null;
          movement_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          workspace_id: string;
          product_id: string;
          movement_type:
            | "purchase"
            | "sale"
            | "adjustment_in"
            | "adjustment_out"
            | "opening_stock"
            | "return_in"
            | "return_out";
          quantity: number;
          unit_cost?: number | null;
          reference_type?: string | null;
          reference_id?: string | null;
          notes?: string | null;
          movement_date?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          workspace_id?: string;
          product_id?: string;
          movement_type?:
            | "purchase"
            | "sale"
            | "adjustment_in"
            | "adjustment_out"
            | "opening_stock"
            | "return_in"
            | "return_out";
          quantity?: number;
          unit_cost?: number | null;
          reference_type?: string | null;
          reference_id?: string | null;
          notes?: string | null;
          movement_date?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_movements_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          }
        ];
      };
      customer_credits: {
        Row: {
          id: string;
          user_id: string;
          workspace_id: string;
          customer_name: string;
          phone: string | null;
          original_amount: number;
          credit_date: string;
          due_date: string | null;
          notes: string | null;
          status: "pending" | "partial" | "paid" | "overdue";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          workspace_id: string;
          customer_name: string;
          phone?: string | null;
          original_amount: number;
          credit_date: string;
          due_date?: string | null;
          notes?: string | null;
          status?: "pending" | "partial" | "paid" | "overdue";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          workspace_id?: string;
          customer_name?: string;
          phone?: string | null;
          original_amount?: number;
          credit_date?: string;
          due_date?: string | null;
          notes?: string | null;
          status?: "pending" | "partial" | "paid" | "overdue";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_credits_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          }
        ];
      };
      customer_credit_payments: {
        Row: {
          id: string;
          user_id: string;
          customer_credit_id: string;
          amount: number;
          payment_date: string;
          payment_method: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          customer_credit_id: string;
          amount: number;
          payment_date: string;
          payment_method?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          customer_credit_id?: string;
          amount?: number;
          payment_date?: string;
          payment_method?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_credit_payments_customer_credit_id_fkey";
            columns: ["customer_credit_id"];
            referencedRelation: "customer_credits";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      provision_user_defaults: {
        Args: {
          p_user_id: string;
        };
        Returns: void;
      };
      record_debt_payment: {
        Args: {
          p_debt_id: string;
          p_amount: number;
          p_payment_date?: string;
          p_payment_method?: string;
          p_notes?: string | null;
        };
        Returns: {
          payment_id: string;
          debt_id: string;
          amount: number;
          total_paid: number;
          remaining: number;
          status: string;
        };
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Convenient row aliases
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
