export interface FieldPosition {
  id: string;
  fieldType: 'SIGNATURE' | 'DATE' | 'TEXT' | 'INITIALS' | 'CHECKBOX';
  page: number;
  positionX: number; // percentage 0-100
  positionY: number; // percentage 0-100
  width: number; // percentage 0-100
  height: number; // percentage 0-100
  signerEmail: string;
  signerName?: string;
  required: boolean;
  label?: string;
  order: number;
}

export interface ViewerState {
  currentPage: number;
  totalPages: number;
  scale: number;
}
