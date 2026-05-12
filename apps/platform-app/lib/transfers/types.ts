export type TransferDisposition =
  | 'new'
  | 'contacted'
  | 'quoted'
  | 'won'
  | 'lost'
  | 'rejected';

export type ContactSnapshot = {
  name: string;
  usdot: number;
  domicile: string;
  equipment_class: string;
  power_units: number;
  phone?: string;
  email?: string;
};

export type TransferRow = {
  id: string;
  partner_org_id: string;
  carrier_org_id: string;
  disposition: TransferDisposition;
  match_criteria: string[];
  signals: Record<string, string | number | boolean>;
  contact_snapshot: ContactSnapshot;
  created_at: string;
  contacted_at: string | null;
  quoted_at: string | null;
  closed_at: string | null;
};
