
export interface LayoutPoint {
  x: number;
  y: number;
}

export interface CanvasSize {
  width: number;
  height: number;
}

export interface RectangleGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PolygonGeometry {
  points: LayoutPoint[];
}

export interface LayoutField {
  field_id: string;
  shape: "rectangle" | "polygon";
  rectangle?: RectangleGeometry | null;
  polygon?: PolygonGeometry | null;
}

export interface FarmLayoutData {
  schema_version: 1;
  canvas: CanvasSize;
  fields: LayoutField[];
}

export interface FarmLayoutSave {
  layout_data: FarmLayoutData;
}

export interface FarmLayoutResponse {
  id: string;
  farm_id: string;
  layout_data: FarmLayoutData;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_FARM_LAYOUT: FarmLayoutData = {
  schema_version: 1,
  canvas: {
    width: 1200,
    height: 800,
  },
  fields: [],
};
