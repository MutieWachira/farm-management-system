
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";

import { getFields } from "@/src/lib/field-api";
import { getCrops } from "@/src/lib/crop-api";
import { isPlantingDateDue } from "@/src/lib/crop-lifecycle";
import { formatAcres } from "@/src/lib/area";
import {
  getFarmLayout,
  saveFarmLayout,
} from "@/src/lib/farm-layout-api";

import type { Field } from "@/src/types/field";
import type { Crop } from "@/src/types/crop";
import {
  DEFAULT_FARM_LAYOUT,
  type FarmLayoutData,
  type LayoutField,
  type LayoutPoint,
  type RectangleGeometry,
} from "@/src/types/farm-layout";

type CropMap = Record<string, Crop[]>;

type Interaction =
  | {
      mode: "drag";
      fieldId: string;
      start: LayoutPoint;
      original: LayoutField;
    }
  | {
      mode: "resize";
      fieldId: string;
      start: LayoutPoint;
      original: LayoutField;
    };

type Camera = {
  x: number;
  y: number;
  zoom: number;
};

type PanInteraction = {
  start: LayoutPoint;
  camera: Camera;
};

const MIN_SIZE = 60;
const PADDING = 20;
const MIN_ZOOM = 0.65;
const MAX_ZOOM = 2.5;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

type CropVisualType =
  | "field-corn"
  | "popcorn"
  | "sweet-corn"
  | "maize"
  | "soybean"
  | "dry-bean"
  | "green-bean"
  | "runner-bean"
  | "legume"
  | "cereal"
  | "fruiting"
  | "leafy"
  | "tuber"
  | "other";

function getCropVisualType(crop: Crop): CropVisualType {
  const name = `${crop.name} ${crop.variety ?? ""}`
    .toLowerCase()
    .replaceAll("_", " ")
    .replaceAll("-", " ");

  if (/\b(popcorn|pop corn|popping corn)\b/.test(name)) return "popcorn";
  if (/\b(sweet corn|sweetcorn)\b/.test(name)) return "sweet-corn";
  if (/\b(field corn|dent corn|flint corn)\b/.test(name)) return "field-corn";
  if (/\b(maize|corn)\b/.test(name)) return "maize";
  if (/\b(soybean|soybeans|soya bean|soya beans|soy bean|soy beans|soy|soya)\b/.test(name)) {
    return "soybean";
  }
  if (/\b(green bean|green beans|snap bean|snap beans|string bean|string beans)\b/.test(name)) {
    return "green-bean";
  }
  if (/\b(kidney bean|pinto bean|black bean|navy bean|dry bean)\b/.test(name)) {
    return "dry-bean";
  }
  if (/\b(runner bean|runner beans)\b/.test(name)) return "runner-bean";
  if (/\b(bean|beans|pea|peas|lentil|legume)\b/.test(name)) return "legume";
  if (/\b(wheat|barley|oat|rice|sorghum|millet)\b/.test(name)) {
    return "cereal";
  }
  if (/\b(tomato|pepper|chilli|chili|capsicum|eggplant)\b/.test(name)) {
    return "fruiting";
  }
  if (/\b(cabbage|kale|spinach|lettuce|amaranth)\b/.test(name)) {
    return "leafy";
  }
  if (/\b(banana|cassava|potato|yam|sweet potato)\b/.test(name)) {
    return "tuber";
  }

  return "other";
}

const CROP_VISUALS: Record<
  CropVisualType,
  { label: string; leaf: string; accent: string }
> = {
  "field-corn": {
    label: "Field corn",
    leaf: "#a8c95e",
    accent: "#c99a31",
  },
  popcorn: { label: "Popcorn", leaf: "#bbd66d", accent: "#f0d36b" },
  "sweet-corn": {
    label: "Sweet corn",
    leaf: "#c4dc75",
    accent: "#ffd447",
  },
  maize: { label: "Maize / corn", leaf: "#b9d66a", accent: "#f3c64e" },
  soybean: { label: "Soybeans", leaf: "#8fbd68", accent: "#d9c76a" },
  "dry-bean": { label: "Dry beans", leaf: "#91bd69", accent: "#b78552" },
  "green-bean": {
    label: "Green / snap beans",
    leaf: "#76b866",
    accent: "#77a948",
  },
  "runner-bean": {
    label: "Runner beans",
    leaf: "#70aa65",
    accent: "#d45b46",
  },
  legume: { label: "Beans / legumes", leaf: "#9bc96b", accent: "#77a948" },
  cereal: { label: "Cereal crops", leaf: "#d9c46d", accent: "#b7a34e" },
  fruiting: { label: "Fruiting crops", leaf: "#75b86a", accent: "#e87954" },
  leafy: { label: "Leafy vegetables", leaf: "#83bd63", accent: "#c6df91" },
  tuber: { label: "Root & tuber crops", leaf: "#95bc65", accent: "#b68a54" },
  other: { label: "Other crops", leaf: "#b4ce72", accent: "#91b95f" },
};

function makeDefaultLayout(fields: Field[]): FarmLayoutData {
  const canvas = DEFAULT_FARM_LAYOUT.canvas;
  const columns = Math.max(1, Math.ceil(Math.sqrt(fields.length)));
  const rows = Math.max(1, Math.ceil(fields.length / columns));

  const cellWidth = (canvas.width - PADDING * 2) / columns;
  const cellHeight = (canvas.height - PADDING * 2) / rows;

  const plotWidth = Math.max(80, cellWidth - 24);
  const plotHeight = Math.max(70, cellHeight - 24);

  return {
    ...DEFAULT_FARM_LAYOUT,
    fields: fields.map((field, index) => ({
      field_id: field.id,
      shape: "rectangle",
      rectangle: {
        x: PADDING + (index % columns) * cellWidth + 8,
        y: PADDING + Math.floor(index / columns) * cellHeight + 8,
        width: Math.min(plotWidth, canvas.width - PADDING * 2),
        height: Math.min(plotHeight, canvas.height - PADDING * 2),
      },
      polygon: null,
    })),
  };
}

function normalizeLayout(
  saved: FarmLayoutData,
  fields: Field[],
): FarmLayoutData {
  const defaults = makeDefaultLayout(fields);
  const savedById = new Map(
    saved.fields.map((item) => [item.field_id, item]),
  );

  return {
    schema_version: 1,
    canvas: DEFAULT_FARM_LAYOUT.canvas,
    fields: defaults.fields.map(
      (fallback) => savedById.get(fallback.field_id) ?? fallback,
    ),
  };
}

export default function FarmVisualizationPage() {
  const params = useParams<{ farmId: string }>();
  const router = useRouter();
  const farmId = params.farmId;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const interactionRef = useRef<Interaction | null>(null);
  const panRef = useRef<PanInteraction | null>(null);

  const [fields, setFields] = useState<Field[]>([]);
  const [cropsByField, setCropsByField] = useState<CropMap>({});
  const [layout, setLayout] = useState<FarmLayoutData>(
    DEFAULT_FARM_LAYOUT,
  );
  const [camera, setCamera] = useState<Camera>({
    x: 0,
    y: 0,
    zoom: 1,
  });

  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cropLoadErrors, setCropLoadErrors] = useState<string[]>([]);

  const [polygonMode, setPolygonMode] = useState(false);
  const [polygonPoints, setPolygonPoints] = useState<LayoutPoint[]>([]);

  const [animationPlaying, setAnimationPlaying] = useState(false);
  const [growthStage, setGrowthStage] = useState(0);
  const [isPanning, setIsPanning] = useState(false);

  const selectedField = fields.find(
    (field) => field.id === selectedFieldId,
  );

  const loadData = useCallback(async () => {
    if (!farmId) return;

    setLoading(true);
    setError("");
    setNotice("");
    setCropLoadErrors([]);

    try {
      const loadedFields = await getFields(farmId);
      setFields(loadedFields);

      const cropResults = await Promise.all(
        loadedFields.map(async (field) => {
          try {
            return {
              fieldId: field.id,
              crops: await getCrops(field.id),
            };
          } catch {
            return { fieldId: field.id, crops: null };
          }
        }),
      );
      const failedCropFields = cropResults
        .filter((result) => result.crops === null)
        .map(
          (result) =>
            loadedFields.find((field) => field.id === result.fieldId)?.name ??
            "Unknown field",
        );

      setCropLoadErrors(failedCropFields);
      setCropsByField(
        Object.fromEntries(
          cropResults.map((result) => [
            result.fieldId,
            result.crops ?? [],
          ]),
        ),
      );

      let savedLayout: Awaited<ReturnType<typeof getFarmLayout>> = null;

      try {
        savedLayout = await getFarmLayout(farmId);
      } catch {
        // Existing fields remain viewable if no saved layout is available.
        setNotice(
          "The saved layout could not be loaded. You can still arrange the fields and try again.",
        );
      }

      setLayout(
        savedLayout
          ? normalizeLayout(savedLayout.layout_data, loadedFields)
          : makeDefaultLayout(loadedFields),
      );

      setSelectedFieldId((current) => {
        if (current && loadedFields.some((field) => field.id === current)) {
          return current;
        }
        return loadedFields[0]?.id ?? null;
      });

      setDirty(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load the farm fields.",
      );
    } finally {
      setLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!mounted) return;
      try {
        await loadData();
      } catch {
        // ignore - loadData reports its own errors
      }
    })();

    return () => {
      mounted = false;
    };
  }, [loadData]);

  useEffect(() => {
    if (!animationPlaying) return;

    const timer = window.setInterval(() => {
      setGrowthStage((stage) => (stage >= 5 ? 0 : stage + 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [animationPlaying]);

  const selectedPlot = useMemo(
    () =>
      layout.fields.find(
        (item) => item.field_id === selectedFieldId,
      ),
    [layout.fields, selectedFieldId],
  );

  const farmMetrics = useMemo(() => {
    const totalArea = fields.reduce(
      (total, field) => total + field.area_hectares,
      0,
    );
    const activeArea = fields.reduce(
      (total, field) =>
        total +
        (field.status === "ACTIVE" ? field.area_hectares : 0),
      0,
    );
    const cropCount = Object.values(cropsByField).reduce(
      (total, crops) => total + crops.length,
      0,
    );
    const growingCropCount = Object.values(cropsByField)
      .flat()
      .filter(
        (crop) =>
          crop.status === "PLANTED" || crop.status === "GROWING",
      ).length;

    return { totalArea, activeArea, cropCount, growingCropCount };
  }, [cropsByField, fields]);

  const cropLegend = useMemo(() => {
    const uniqueCrops = new Map<string, Crop>();

    Object.values(cropsByField)
      .flat()
      .filter((crop) =>
        ["PLANNED", "PLANTED", "GROWING"].includes(crop.status),
      )
      .forEach((crop) => {
        const key =
          `${crop.name.trim()} ${crop.variety ?? ""}`.toLocaleLowerCase();
        if (!uniqueCrops.has(key)) uniqueCrops.set(key, crop);
      });

    return Array.from(uniqueCrops.values());
  }, [cropsByField]);

  const getScreenPoint = useCallback(
    (event: React.PointerEvent<SVGSVGElement>): LayoutPoint => {
      const svg = svgRef.current;

      if (!svg) return { x: 0, y: 0 };

      const rect = svg.getBoundingClientRect();

      return {
        x:
          ((event.clientX - rect.left) / rect.width) *
          layout.canvas.width,
        y:
          ((event.clientY - rect.top) / rect.height) *
          layout.canvas.height,
      };
    },
    [layout.canvas.height, layout.canvas.width],
  );

  const getCanvasPoint = useCallback(
    (event: React.PointerEvent<SVGSVGElement>): LayoutPoint => {
      const point = getScreenPoint(event);

      return {
        x: (point.x - camera.x) / camera.zoom,
        y: (point.y - camera.y) / camera.zoom,
      };
    },
    [camera, getScreenPoint],
  );

  const handleCanvasPointerDown = (
    event: React.PointerEvent<SVGSVGElement>,
  ) => {
    if (polygonMode) {
      addPolygonPoint(event);
      return;
    }

    const isCanvasBackground =
      event.target === event.currentTarget ||
      (event.target instanceof SVGElement &&
        event.target.dataset.farmGround === "true");

    if (!isCanvasBackground || event.button !== 0) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    panRef.current = {
      start: getScreenPoint(event),
      camera,
    };
    setIsPanning(true);
  };

  const handleCanvasWheel = (
    event: React.WheelEvent<SVGSVGElement>,
  ) => {
    event.preventDefault();

    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const pointer = {
      x: ((event.clientX - rect.left) / rect.width) * layout.canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * layout.canvas.height,
    };
    const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;

    setCamera((current) => {
      const zoom = clamp(current.zoom * factor, MIN_ZOOM, MAX_ZOOM);
      const worldX = (pointer.x - current.x) / current.zoom;
      const worldY = (pointer.y - current.y) / current.zoom;

      return {
        zoom,
        x: pointer.x - worldX * zoom,
        y: pointer.y - worldY * zoom,
      };
    });
  };

  const zoomAtCenter = (factor: number) => {
    const center = {
      x: layout.canvas.width / 2,
      y: layout.canvas.height / 2,
    };

    setCamera((current) => {
      const zoom = clamp(current.zoom * factor, MIN_ZOOM, MAX_ZOOM);
      const worldX = (center.x - current.x) / current.zoom;
      const worldY = (center.y - current.y) / current.zoom;

      return {
        zoom,
        x: center.x - worldX * zoom,
        y: center.y - worldY * zoom,
      };
    });
  };

  const updatePlot = useCallback(
    (fieldId: string, updater: (plot: LayoutField) => LayoutField) => {
      setLayout((current) => ({
        ...current,
        fields: current.fields.map((plot) =>
          plot.field_id === fieldId ? updater(plot) : plot,
        ),
      }));

      setDirty(true);
      setNotice("");
    },
    [],
  );

  const beginInteraction = (
    event: React.PointerEvent<SVGElement>,
    plot: LayoutField,
    mode: Interaction["mode"],
  ) => {
    if (polygonMode) return;

    event.preventDefault();
    event.stopPropagation();

    const start = getCanvasPoint(
      event as React.PointerEvent<SVGSVGElement>,
    );

    interactionRef.current = {
      mode,
      fieldId: plot.field_id,
      start,
      original: structuredClone(plot),
    };

    setSelectedFieldId(plot.field_id);
    setNotice("");
  };

  const handlePointerMove = (
    event: React.PointerEvent<SVGSVGElement>,
  ) => {
    const pan = panRef.current;

    if (pan) {
      const point = getScreenPoint(event);
      setCamera({
        ...pan.camera,
        x: pan.camera.x + point.x - pan.start.x,
        y: pan.camera.y + point.y - pan.start.y,
      });
      return;
    }

    const interaction = interactionRef.current;
    if (!interaction) return;

    const point = getCanvasPoint(event);
    const dx = point.x - interaction.start.x;
    const dy = point.y - interaction.start.y;
    const original = interaction.original;

    if (original.shape === "rectangle" && original.rectangle) {
      const rect = original.rectangle;
      let next: RectangleGeometry;

      if (interaction.mode === "drag") {
        next = {
          ...rect,
          x: clamp(
            rect.x + dx,
            0,
            layout.canvas.width - rect.width,
          ),
          y: clamp(
            rect.y + dy,
            0,
            layout.canvas.height - rect.height,
          ),
        };
      } else {
        next = {
          ...rect,
          width: clamp(
            rect.width + dx,
            MIN_SIZE,
            layout.canvas.width - rect.x,
          ),
          height: clamp(
            rect.height + dy,
            MIN_SIZE,
            layout.canvas.height - rect.y,
          ),
        };
      }

      setLayout((current) => ({
        ...current,
        fields: current.fields.map((plot) =>
          plot.field_id === interaction.fieldId
            ? { ...plot, rectangle: next }
            : plot,
        ),
      }));

      setDirty(true);
      return;
    }

    if (original.shape === "polygon" && original.polygon) {
      const points = original.polygon.points.map((vertex) => ({
        x: clamp(
          vertex.x + dx,
          0,
          layout.canvas.width,
        ),
        y: clamp(
          vertex.y + dy,
          0,
          layout.canvas.height,
        ),
      }));

      setLayout((current) => ({
        ...current,
        fields: current.fields.map((plot) =>
          plot.field_id === interaction.fieldId
            ? { ...plot, polygon: { points } }
            : plot,
        ),
      }));

      setDirty(true);
    }
  };

  const handlePointerUp = () => {
    interactionRef.current = null;
    panRef.current = null;
    setIsPanning(false);
  };

  const addPolygonPoint = (
    event: React.PointerEvent<SVGSVGElement>,
  ) => {
    if (!polygonMode) return;

    event.preventDefault();
    setPolygonPoints((current) => [
      ...current,
      getCanvasPoint(event),
    ]);
  };

  const finishPolygon = () => {
    if (!selectedFieldId) {
      setError("Select a field before creating its polygon.");
      return;
    }

    if (polygonPoints.length < 3) {
      setError("A polygon needs at least three points.");
      return;
    }

    updatePlot(selectedFieldId, (plot) => ({
      ...plot,
      shape: "polygon",
      rectangle: null,
      polygon: { points: polygonPoints },
    }));

    setPolygonMode(false);
    setPolygonPoints([]);
    setError("");
    setNotice("Custom field shape created. Save to keep your changes.");
  };

  const useRectangle = () => {
    if (!selectedFieldId) return;

    updatePlot(selectedFieldId, (plot) => {
      const oldRect = plot.rectangle;

      return {
        ...plot,
        shape: "rectangle",
        rectangle:
          oldRect ?? {
            x: 100,
            y: 100,
            width: 180,
            height: 120,
          },
        polygon: null,
      };
    });

    setPolygonMode(false);
    setPolygonPoints([]);
  };

  const handleSave = async () => {
    if (!farmId || saving) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      await saveFarmLayout(farmId, { layout_data: layout });
      setDirty(false);
      setNotice("Farm layout saved successfully.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to save the farm layout.",
      );
    } finally {
      setSaving(false);
    }
  };

  const cropStatusText = (crop: Crop) =>
    crop.status.toLowerCase().replaceAll("_", " ");

  if (loading) {
    return (
      <main className="min-h-screen bg-white p-4 sm:p-6">
        <div className="mx-auto max-w-7xl">
        <p className="text-sm text-gray-600">Loading farm visualization…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-4 py-6 sm:px-6 lg:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => router.push(`/user/farms/${farmId}`)}
            className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 transition hover:text-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
          >
            <span aria-hidden="true">←</span> Back to farm
          </button>

          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
            Farm intelligence
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Field visualization
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Explore a living view of your fields, crop activity, and
            farm monitoring readiness.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!dirty || saving || fields.length === 0}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
        >
          {saving ? "Saving layout…" : dirty ? "Save layout" : "Layout saved"}
        </button>
      </header>

      <section
        aria-label="Farm analytics"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {[
          {
            label: "Mapped field area",
            value: formatAcres(farmMetrics.totalArea),
            detail: `${fields.length} mapped field${fields.length === 1 ? "" : "s"}`,
            icon: "▦",
          },
          {
            label: "Active land",
            value: formatAcres(farmMetrics.activeArea),
            detail: "Across active fields",
            icon: "↗",
          },
          {
            label: "Crop records",
            value: farmMetrics.cropCount.toLocaleString(),
            detail: `${farmMetrics.growingCropCount} planted or growing`,
            icon: "✳",
          },
          {
            label: "Monitoring",
            value: "Needs setup",
            detail: "Connect field sensors for live readings",
            icon: "⌁",
          },
        ].map((metric) => (
          <article
            key={metric.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  {metric.label}
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                  {metric.value}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {metric.detail}
                </p>
              </div>
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-lg font-semibold text-emerald-700"
              >
                {metric.icon}
              </span>
            </div>
          </article>
        ))}
      </section>

      <section
        aria-labelledby="field-conditions-heading"
        className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5"
      >
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              id="field-conditions-heading"
              className="text-base font-bold text-slate-900"
            >
              Field conditions
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Live sensor readings appear here once field devices are
              connected.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            No sensors connected
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              label: "Soil temperature",
              unit: "°C",
              detail: "Root-zone sensor",
            },
            {
              label: "Soil moisture",
              unit: "%",
              detail: "Volumetric water content",
            },
            {
              label: "Air humidity",
              unit: "%",
              detail: "Field microclimate",
            },
          ].map((reading) => (
            <article
              key={reading.label}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"
            >
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  {reading.label}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {reading.detail}
                </p>
              </div>
              <p
                className="whitespace-nowrap text-lg font-bold text-slate-400"
                aria-label={`${reading.label} unavailable until a sensor is connected`}
              >
                — <span className="text-xs font-medium">{reading.unit}</span>
              </p>
            </article>
          ))}
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800"
        >
          {notice}
        </div>
      )}

      {cropLoadErrors.length > 0 && (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          Crop records could not be loaded for{" "}
          {cropLoadErrors.join(", ")}. Reload the farm view to try again.
        </div>
      )}

      <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <label
              htmlFor="field-select"
              className="text-sm font-medium text-gray-700"
            >
              Selected field
            </label>

            <select
              id="field-select"
              value={selectedFieldId ?? ""}
              onChange={(event) => {
                setSelectedFieldId(event.target.value || null);
                setPolygonMode(false);
                setPolygonPoints([]);
                setError("");
              }}
              className="min-h-10 min-w-36 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            >
              {fields.length === 0 && (
                <option value="">No fields available</option>
              )}

              {fields.map((field) => (
                <option key={field.id} value={field.id}>
                  {field.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={useRectangle}
              disabled={!selectedFieldId}
              className="min-h-10 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Use rectangle
            </button>

            <button
              type="button"
              onClick={() => {
                if (!selectedFieldId) return;

                setPolygonMode(true);
                setPolygonPoints([]);
                setError("");
                setNotice(
                  "Click at least three points on the canvas, then finish the polygon.",
                );
              }}
              disabled={!selectedFieldId}
              className="min-h-10 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Draw polygon
            </button>

            {polygonMode && (
              <>
                <button
                  type="button"
                  onClick={finishPolygon}
                  className="rounded-lg bg-green-700 px-3 py-2 text-sm font-medium text-white hover:bg-green-800"
                >
                  Finish polygon ({polygonPoints.length} points)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPolygonMode(false);
                    setPolygonPoints([]);
                    setNotice("");
                  }}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  Cancel
                </button>
              </>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-4 sm:px-5">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Isometric field plan
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {polygonMode
                    ? "Click the canvas to place polygon points."
                    : "Drag open ground to pan · scroll to zoom · drag fields to arrange"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                  {fields.length} field{fields.length === 1 ? "" : "s"}
                </span>
                <span className="hidden rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 sm:inline-flex">
                  3D view
                </span>
                <div
                  className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-1"
                  aria-label="Map zoom controls"
                >
                  <button
                    type="button"
                    onClick={() => zoomAtCenter(1 / 1.2)}
                    disabled={camera.zoom <= MIN_ZOOM}
                    aria-label="Zoom out"
                    className="h-8 w-8 rounded-md text-lg font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    −
                  </button>
                  <span
                    aria-live="polite"
                    className="min-w-12 text-center text-xs font-semibold tabular-nums text-slate-600"
                  >
                    {Math.round(camera.zoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => zoomAtCenter(1.2)}
                    disabled={camera.zoom >= MAX_ZOOM}
                    aria-label="Zoom in"
                    className="h-8 w-8 rounded-md text-lg font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => setCamera({ x: 0, y: 0, zoom: 1 })}
                    aria-label="Reset map view"
                    className="ml-1 h-8 rounded-md px-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-50"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {fields.length === 0 ? (
              <div className="p-10 text-center">
                <p className="font-medium text-gray-800">
                  No fields found
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Create a field first, then return here to visualize it.
                </p>
              </div>
            ) : (
              <div className="w-full bg-white p-2 sm:p-4">
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${layout.canvas.width} ${layout.canvas.height}`}
                  role="application"
                  aria-label="Interactive farm field layout"
                  className={`block h-auto w-full touch-none ${
                    polygonMode
                      ? "cursor-crosshair"
                      : isPanning
                        ? "cursor-grabbing"
                        : "cursor-grab"
                  }`}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  onPointerDown={handleCanvasPointerDown}
                  onWheel={handleCanvasWheel}
                >
                  <defs>
                    <pattern
                      id="farm-grid"
                      width="40"
                      height="40"
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d="M 40 0 L 0 0 0 40"
                        fill="none"
                        stroke="#e7ece6"
                        strokeWidth="1"
                      />
                    </pattern>
                    <pattern
                      id="farm-field-rows"
                      width="28"
                      height="28"
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d="M 4 0 V 28 M 14 0 V 28 M 24 0 V 28"
                        fill="none"
                        stroke="#315c37"
                        strokeWidth="2"
                      />
                    </pattern>
                    {layout.fields.map((plot, index) => {
                      const clipId = `field-crop-clip-${index}`;

                      if (plot.shape === "rectangle" && plot.rectangle) {
                        return (
                          <clipPath key={clipId} id={clipId}>
                            <rect
                              x={plot.rectangle.x}
                              y={plot.rectangle.y}
                              width={plot.rectangle.width}
                              height={plot.rectangle.height}
                              rx="8"
                            />
                          </clipPath>
                        );
                      }

                      if (plot.shape === "polygon" && plot.polygon) {
                        return (
                          <clipPath key={clipId} id={clipId}>
                            <polygon
                              points={plot.polygon.points
                                .map((point) => `${point.x},${point.y}`)
                                .join(" ")}
                            />
                          </clipPath>
                        );
                      }

                      return null;
                    })}
                  </defs>

                  <g
                    transform={`translate(${camera.x} ${camera.y}) scale(${camera.zoom})`}
                  >
                    <rect
                      data-farm-ground="true"
                      width={layout.canvas.width}
                      height={layout.canvas.height}
                      fill="#f8faf8"
                    />
                    <rect
                      width={layout.canvas.width}
                      height={layout.canvas.height}
                      fill="url(#farm-grid)"
                      pointerEvents="none"
                    />

                  {layout.fields.map((plot, plotIndex) => {
                    const field = fields.find(
                      (item) => item.id === plot.field_id,
                    );

                    if (!field) return null;

                    const crops = cropsByField[field.id] ?? [];
                    const visibleCrops = crops.filter(
                      (crop) =>
                        crop.status === "PLANNED" ||
                        crop.status === "PLANTED" ||
                        crop.status === "GROWING",
                    );
                    const visibleFieldCrops = visibleCrops.slice(0, 8);
                    const isSelected = selectedFieldId === field.id;

                    const fill =
                      field.status === "FALLOW"
                        ? "#9b7955"
                        : field.status === "INACTIVE"
                          ? "#94a3a1"
                          : "#805437";

                    const depthX = 18;
                    const depthY = 13;
                    const cropBounds =
                      plot.shape === "rectangle" && plot.rectangle
                        ? plot.rectangle
                        : plot.polygon
                          ? {
                              x: Math.min(
                                ...plot.polygon.points.map((point) => point.x),
                              ),
                              y: Math.min(
                                ...plot.polygon.points.map((point) => point.y),
                              ),
                              width:
                                Math.max(
                                  ...plot.polygon.points.map((point) => point.x),
                                ) -
                                Math.min(
                                  ...plot.polygon.points.map((point) => point.x),
                                ),
                              height:
                                Math.max(
                                  ...plot.polygon.points.map((point) => point.y),
                                ) -
                                Math.min(
                                  ...plot.polygon.points.map((point) => point.y),
                                ),
                            }
                          : null;
                    const cropSummary =
                      crops.length > 0
                        ? `${crops
                            .slice(0, 2)
                            .map((crop) => crop.name)
                            .join(" · ")}${crops.length > 2 ? ` +${crops.length - 2}` : ""}`
                        : "No crops recorded";

                    return (
                      <g key={plot.field_id}>
                        {plot.shape === "rectangle" && plot.rectangle && (
                          <>
                            <polygon
                              aria-hidden="true"
                              points={`${plot.rectangle.x},${plot.rectangle.y + plot.rectangle.height} ${plot.rectangle.x + plot.rectangle.width},${plot.rectangle.y + plot.rectangle.height} ${plot.rectangle.x + plot.rectangle.width + depthX},${plot.rectangle.y + plot.rectangle.height - depthY} ${plot.rectangle.x + depthX},${plot.rectangle.y + plot.rectangle.height - depthY}`}
                              fill={field.status === "FALLOW" ? "#67472f" : field.status === "INACTIVE" ? "#64716e" : "#593a26"}
                              pointerEvents="none"
                            />
                            <polygon
                              aria-hidden="true"
                              points={`${plot.rectangle.x + plot.rectangle.width},${plot.rectangle.y} ${plot.rectangle.x + plot.rectangle.width + depthX},${plot.rectangle.y - depthY} ${plot.rectangle.x + plot.rectangle.width + depthX},${plot.rectangle.y + plot.rectangle.height - depthY} ${plot.rectangle.x + plot.rectangle.width},${plot.rectangle.y + plot.rectangle.height}`}
                              fill={field.status === "FALLOW" ? "#806342" : field.status === "INACTIVE" ? "#82908b" : "#70472d"}
                              pointerEvents="none"
                            />
                            <rect
                              x={plot.rectangle.x}
                              y={plot.rectangle.y}
                              width={plot.rectangle.width}
                              height={plot.rectangle.height}
                              rx="8"
                              fill={fill}
                              stroke={isSelected ? "#f0b850" : "#64432f"}
                              strokeWidth={isSelected ? 4 : 2}
                              className="cursor-grab active:cursor-grabbing"
                              onPointerDown={(event) =>
                                beginInteraction(event, plot, "drag")
                              }
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedFieldId(field.id);
                              }}
                            />
                            <rect
                              aria-hidden="true"
                              x={plot.rectangle.x}
                              y={plot.rectangle.y}
                              width={plot.rectangle.width}
                              height={plot.rectangle.height}
                              fill="url(#farm-field-rows)"
                              opacity={field.status === "ACTIVE" ? 0.42 : 0.12}
                              pointerEvents="none"
                            />

                            {isSelected && (
                              <rect
                                x={
                                  plot.rectangle.x +
                                  plot.rectangle.width -
                                  9
                                }
                                y={
                                  plot.rectangle.y +
                                  plot.rectangle.height -
                                  9
                                }
                                width="18"
                                height="18"
                                rx="3"
                                fill="#166534"
                                stroke="white"
                                strokeWidth="2"
                                className="cursor-nwse-resize"
                                onPointerDown={(event) =>
                                  beginInteraction(event, plot, "resize")
                                }
                              />
                            )}
                          </>
                        )}

                        {plot.shape === "polygon" && plot.polygon && (
                          <>
                            <polygon
                              aria-hidden="true"
                              points={plot.polygon.points
                                .map((point) => `${point.x + depthX},${point.y + depthY}`)
                                .join(" ")}
                              fill={field.status === "FALLOW" ? "#67472f" : field.status === "INACTIVE" ? "#64716e" : "#593a26"}
                              pointerEvents="none"
                            />
                            <polygon
                              points={plot.polygon.points
                                .map((point) => `${point.x},${point.y}`)
                                .join(" ")}
                              fill={fill}
                              stroke={isSelected ? "#f0b850" : "#64432f"}
                              strokeWidth={isSelected ? 4 : 2}
                              strokeLinejoin="round"
                              className="cursor-grab active:cursor-grabbing"
                              onPointerDown={(event) =>
                                beginInteraction(event, plot, "drag")
                              }
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedFieldId(field.id);
                              }}
                            />
                            <polygon
                              aria-hidden="true"
                              points={plot.polygon.points
                                .map((point) => `${point.x},${point.y}`)
                                .join(" ")}
                              fill="url(#farm-field-rows)"
                              opacity={field.status === "ACTIVE" ? 0.42 : 0.12}
                              pointerEvents="none"
                            />
                          </>
                        )}

                        {cropBounds && (
                          <g
                            clipPath={`url(#field-crop-clip-${plotIndex})`}
                            pointerEvents="none"
                          >
                            <title>
                              {`${field.name}: ${
                                crops.length > 0
                                  ? crops
                                      .map(
                                        (crop) =>
                                          `${crop.name} (${cropStatusText(crop)})`,
                                      )
                                      .join(", ")
                                  : "no crops recorded"
                              }`}
                            </title>
                            <text
                              x={cropBounds.x + 12}
                              y={cropBounds.y + 23}
                              fontSize="15"
                              fontWeight="700"
                              fill="#fff8e9"
                            >
                              {field.name.slice(0, 25)}
                            </text>
                            <text
                              x={cropBounds.x + 12}
                              y={cropBounds.y + 40}
                              fontSize="11"
                              fontWeight="600"
                              fill="#f5e4c5"
                            >
                              {cropSummary.slice(0, 48)}
                            </text>

                            {visibleFieldCrops.length > 0 &&
                              (() => {
                                const fieldTop = cropBounds.y + 54;
                                const fieldBottom =
                                  cropBounds.y + cropBounds.height - 12;
                                const usableHeight = Math.max(
                                  1,
                                  fieldBottom - fieldTop,
                                );
                                const rowCount = Math.max(
                                  2,
                                  Math.min(12, Math.floor(usableHeight / 27)),
                                );
                                const rowSpacing = usableHeight / rowCount;
                                const plantCount = Math.max(
                                  2,
                                  Math.min(
                                    16,
                                    Math.floor((cropBounds.width - 28) / 28),
                                  ),
                                );
                                const rowWidth = Math.max(
                                  1,
                                  cropBounds.width - 32,
                                );

                                return Array.from(
                                  { length: rowCount },
                                  (_, rowIndex) => {
                                    const crop =
                                      visibleFieldCrops[
                                        rowIndex % visibleFieldCrops.length
                                      ];
                                    const cropVisual =
                                      CROP_VISUALS[getCropVisualType(crop)];
                                    const cropVisualType =
                                      getCropVisualType(crop);
                                    const rowY =
                                      fieldTop + rowSpacing * (rowIndex + 0.5);
                                    const plantHeight =
                                      9 + ((rowIndex + growthStage) % 3) * 2;

                                    return (
                                      <g key={`crop-row-${rowIndex}`}>
                                        <title>
                                          {`${crop.name}${crop.variety ? ` (${crop.variety})` : ""}`}
                                        </title>
                                        <path
                                          d={`M ${cropBounds.x + 12} ${rowY + 7} H ${cropBounds.x + cropBounds.width - 12}`}
                                          fill="none"
                                          stroke={cropVisual.accent}
                                          strokeWidth="2"
                                          strokeDasharray="2 6"
                                          opacity="0.75"
                                        />
                                        {Array.from(
                                          { length: plantCount },
                                          (_, plantIndex) => {
                                            const x =
                                              cropBounds.x +
                                              16 +
                                              (plantIndex * rowWidth) /
                                                Math.max(1, plantCount - 1);

                                            return (
                                              <g
                                                key={`plant-${rowIndex}-${plantIndex}`}
                                                transform={`translate(${x} ${rowY})`}
                                              >
                                                {crop.status === "PLANNED" ? (
                                                  <ellipse
                                                    cx="0"
                                                    cy="0"
                                                    rx="3"
                                                    ry="2"
                                                    fill={cropVisual.accent}
                                                    stroke="#805437"
                                                    strokeWidth="1"
                                                  />
                                                ) : (
                                                  <g
                                                    className="farm-crop-sprout"
                                                    style={{
                                                      animationDelay: `${(rowIndex * plantCount + plantIndex) * 18}ms`,
                                                    }}
                                                  >
                                                    {[
                                                      "field-corn",
                                                      "popcorn",
                                                      "sweet-corn",
                                                      "maize",
                                                    ].includes(cropVisualType) ? (
                                                      <>
                                                        <path
                                                          d={`M 0 2 Q 1 ${-plantHeight / 2} 0 ${-plantHeight}`}
                                                          fill="none"
                                                          stroke={cropVisual.leaf}
                                                          strokeWidth="2.5"
                                                        />
                                                        <path
                                                          d={`M 0 ${-plantHeight + 8} Q -7 ${-plantHeight + 4} -9 ${-plantHeight + 1} M 0 ${-plantHeight + 6} Q 7 ${-plantHeight + 2} 9 ${-plantHeight}`}
                                                          fill="none"
                                                          stroke={cropVisual.leaf}
                                                          strokeWidth="2.5"
                                                          strokeLinecap="round"
                                                        />
                                                        <ellipse
                                                          cx="3"
                                                          cy={-plantHeight / 2}
                                                          rx={
                                                            cropVisualType ===
                                                            "field-corn"
                                                              ? 3.2
                                                              : cropVisualType ===
                                                                  "popcorn"
                                                                ? 2
                                                                : 2.7
                                                          }
                                                          ry={
                                                            cropVisualType ===
                                                            "field-corn"
                                                              ? 6
                                                              : cropVisualType ===
                                                                  "popcorn"
                                                                ? 3.5
                                                                : 5
                                                          }
                                                          fill={cropVisual.accent}
                                                        />
                                                        {cropVisualType ===
                                                          "sweet-corn" && (
                                                          <path
                                                            d={`M 1 ${-plantHeight / 2 - 3} l 4 2 M 1 ${-plantHeight / 2} l 4 2 M 1 ${-plantHeight / 2 + 3} l 4 2`}
                                                            fill="none"
                                                            stroke="#fff1a6"
                                                            strokeWidth="0.8"
                                                          />
                                                        )}
                                                        {cropVisualType ===
                                                          "popcorn" && (
                                                          <circle
                                                            cx="7"
                                                            cy={-plantHeight / 2 - 2}
                                                            r="1.5"
                                                            fill="#fff4bf"
                                                          />
                                                        )}
                                                      </>
                                                    ) : cropVisualType === "soybean" ? (
                                                      <>
                                                        <path
                                                          d={`M 0 2 C -2 ${-plantHeight / 3} 2 ${-plantHeight * 2 / 3} 0 ${-plantHeight}`}
                                                          fill="none"
                                                          stroke="#b8d78a"
                                                          strokeWidth="2.2"
                                                        />
                                                        {[-1, 1].map((side) => (
                                                          <g
                                                            key={side}
                                                            transform={`translate(${side * 3} ${-plantHeight + (side === -1 ? 5 : 2)})`}
                                                          >
                                                            <ellipse
                                                              cx={side * -3}
                                                              cy="0"
                                                              rx="4.5"
                                                              ry="2.4"
                                                              transform={`rotate(${side * 25} ${side * -3} 0)`}
                                                              fill={cropVisual.leaf}
                                                            />
                                                            <ellipse
                                                              cx={side * 3}
                                                              cy="-1"
                                                              rx="4.5"
                                                              ry="2.4"
                                                              transform={`rotate(${side * -25} ${side * 3} -1)`}
                                                              fill="#a9cf78"
                                                            />
                                                          </g>
                                                        ))}
                                                        <ellipse
                                                          cx="5"
                                                          cy={-plantHeight / 2}
                                                          rx="2.2"
                                                          ry="4.2"
                                                          transform={`rotate(-30 5 ${-plantHeight / 2})`}
                                                          fill={cropVisual.accent}
                                                          stroke="#f0dfa0"
                                                          strokeWidth="0.7"
                                                        />
                                                        <ellipse
                                                          cx="-5"
                                                          cy={-plantHeight / 2 + 3}
                                                          rx="2"
                                                          ry="3.5"
                                                          transform={`rotate(28 -5 ${-plantHeight / 2 + 3})`}
                                                          fill={cropVisual.accent}
                                                          stroke="#f0dfa0"
                                                          strokeWidth="0.7"
                                                        />
                                                      </>
                                                    ) : ["dry-bean", "green-bean", "runner-bean", "legume"].includes(cropVisualType) ? (
                                                      <>
                                                        <path
                                                          d={`M 0 2 C -4 ${-plantHeight / 3} 4 ${-plantHeight * 2 / 3} 0 ${-plantHeight}`}
                                                          fill="none"
                                                          stroke="#d8e99a"
                                                          strokeWidth="2"
                                                        />
                                                        <ellipse
                                                          cx="-4"
                                                          cy={-plantHeight + 5}
                                                          rx="4"
                                                          ry="2"
                                                          fill={cropVisual.leaf}
                                                        />
                                                        <ellipse
                                                          cx="4"
                                                          cy={-plantHeight + 2}
                                                          rx="4"
                                                          ry="2"
                                                          fill={cropVisual.leaf}
                                                        />
                                                        <path
                                                          d={`M 1 ${-plantHeight / 2} Q 6 ${-plantHeight / 2 - 4} 8 ${-plantHeight / 2 + 1}`}
                                                          fill="none"
                                                          stroke={cropVisual.accent}
                                                          strokeWidth="2"
                                                          strokeLinecap="round"
                                                        />
                                                      </>
                                                    ) : cropVisualType === "cereal" ? (
                                                      <>
                                                        <path
                                                          d={`M 0 2 V ${-plantHeight}`}
                                                          fill="none"
                                                          stroke="#bdad5d"
                                                          strokeWidth="2"
                                                        />
                                                        {[-5, -2, 1, 4].map(
                                                          (offset) => (
                                                            <ellipse
                                                              key={offset}
                                                              cx={offset * 0.55}
                                                              cy={-plantHeight + offset}
                                                              rx="2"
                                                              ry="3"
                                                              transform={`rotate(-25 ${offset * 0.55} ${-plantHeight + offset})`}
                                                              fill={cropVisual.accent}
                                                            />
                                                          ),
                                                        )}
                                                      </>
                                                    ) : cropVisualType === "fruiting" ? (
                                                      <>
                                                        <path
                                                          d={`M 0 2 Q 0 ${-plantHeight / 2} 0 ${-plantHeight}`}
                                                          fill="none"
                                                          stroke="#c8e39a"
                                                          strokeWidth="2"
                                                        />
                                                        <ellipse
                                                          cx="-4"
                                                          cy={-plantHeight + 4}
                                                          rx="5"
                                                          ry="2.5"
                                                          transform={`rotate(25 -4 ${-plantHeight + 4})`}
                                                          fill={cropVisual.leaf}
                                                        />
                                                        <ellipse
                                                          cx="4"
                                                          cy={-plantHeight + 1}
                                                          rx="5"
                                                          ry="2.5"
                                                          transform={`rotate(-25 4 ${-plantHeight + 1})`}
                                                          fill={cropVisual.leaf}
                                                        />
                                                        <circle
                                                          cx="1"
                                                          cy={-plantHeight / 2}
                                                          r="2.5"
                                                          fill={cropVisual.accent}
                                                        />
                                                      </>
                                                    ) : (
                                                      <>
                                                        <path
                                                          d={`M 0 2 Q -1 ${-plantHeight / 2} 0 ${-plantHeight}`}
                                                          fill="none"
                                                          stroke={cropVisual.leaf}
                                                          strokeWidth="2.5"
                                                          strokeLinecap="round"
                                                        />
                                                        <g className="farm-crop-leaves">
                                                          <ellipse
                                                            cx="-3"
                                                            cy={-plantHeight + 4}
                                                            rx="4.5"
                                                            ry="2.2"
                                                            transform={`rotate(28 -3 ${-plantHeight + 4})`}
                                                            fill={cropVisual.leaf}
                                                          />
                                                          <ellipse
                                                            cx="3"
                                                            cy={-plantHeight + 1}
                                                            rx="4.5"
                                                            ry="2.2"
                                                            transform={`rotate(-28 3 ${-plantHeight + 1})`}
                                                            fill={cropVisual.accent}
                                                          />
                                                        </g>
                                                      </>
                                                    )}
                                                  </g>
                                                )}
                                              </g>
                                            );
                                          },
                                        )}
                                      </g>
                                    );
                                  },
                                );
                              })()}
                            {visibleFieldCrops.length < visibleCrops.length && (
                              <text
                                x={cropBounds.x + 12}
                                y={cropBounds.y + cropBounds.height - 8}
                                fontSize="10"
                                fontWeight="700"
                                fill="#fff0d2"
                              >
                                +{visibleCrops.length - visibleFieldCrops.length} more crop rows
                              </text>
                            )}
                          </g>
                        )}
                      </g>
                    );
                  })}

                  {polygonMode && polygonPoints.length > 0 && (
                    <g pointerEvents="none">
                      <polyline
                        points={polygonPoints
                          .map((point) => `${point.x},${point.y}`)
                          .join(" ")}
                        fill="none"
                        stroke="#166534"
                        strokeWidth="3"
                        strokeDasharray="7 5"
                      />

                      {polygonPoints.map((point, index) => (
                        <circle
                          key={index}
                          cx={point.x}
                          cy={point.y}
                          r="6"
                          fill="#166534"
                          stroke="white"
                          strokeWidth="2"
                        />
                      ))}
                    </g>
                  )}
                  </g>
                </svg>
              </div>
            )}

            <div className="flex flex-wrap gap-4 border-t border-gray-200 px-4 py-3 text-xs text-gray-600">
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-[#805437]" />
                Active field soil
              </span>
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-[#9b7955]" />
                Fallow soil
              </span>
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-[#94a3a1]" />
                Inactive field
              </span>
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#91b95f]" />
                Planted / growing crops
              </span>
            </div>
            <div className="border-t border-slate-100 px-4 py-3">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Crop key
              </p>
              {cropLegend.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No planned or actively growing crops to show yet.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {cropLegend.map((crop) => {
                    const visual =
                      CROP_VISUALS[getCropVisualType(crop)];

                    return (
                      <span
                        key={`${crop.id}-legend`}
                        title={`${crop.name}: ${visual.label}`}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
                      >
                        <span
                          aria-hidden="true"
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: visual.accent }}
                        />
                        {crop.name}
                        {crop.variety ? ` · ${crop.variety}` : ""}
                        <span className="text-slate-400">
                          {visual.label}
                        </span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <section
            aria-labelledby="irrigation-heading"
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="irrigation-heading"
                  className="font-semibold text-slate-900"
                >
                  Irrigation
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Remote water control
                </p>
              </div>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                Not connected
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Irrigation zones
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Pair a controller to enable switching
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked="false"
                aria-label="Irrigation control unavailable; no controller connected"
                disabled
                className="relative h-7 w-12 shrink-0 cursor-not-allowed rounded-full bg-slate-300 opacity-60"
              >
                <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm" />
              </button>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              This control is disabled until a supported controller is
              configured. No hardware commands are sent from this page.
            </p>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-gray-900">
              Selected field details
            </h2>

            {!selectedField ? (
              <p className="mt-3 text-sm text-gray-500">
                Select a field to view its details.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedField.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatAcres(selectedField.area_hectares)}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-gray-500">Field status</span>
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                    {selectedField.status}
                  </span>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Soil type
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedField.soil_type || "Not specified"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Shape
                  </p>
                  <p className="text-sm capitalize text-gray-600">
                    {selectedPlot?.shape ?? "Not placed"}
                  </p>
                </div>

                {selectedField.description && (
                  <p className="text-sm text-gray-600">
                    {selectedField.description}
                  </p>
                )}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-gray-900">Crops in this field</h2>

            {!selectedField ? (
              <p className="mt-3 text-sm text-gray-500">
                Select a field to view its crops.
              </p>
            ) : (cropsByField[selectedField.id] ?? []).length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">
                No crops were found for this field.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {(cropsByField[selectedField.id] ?? []).map((crop) => (
                  <li
                    key={crop.id}
                    className="rounded-lg border border-gray-100 bg-gray-50 p-3"
                  >
                    <p className="font-medium text-gray-900">{crop.name}</p>
                    {crop.variety && (
                      <p className="text-xs text-gray-500">
                        Variety: {crop.variety}
                      </p>
                    )}
                    <p className="mt-1 text-xs capitalize text-gray-600">
                      Status: {cropStatusText(crop)}
                    </p>
                    {crop.status === "PLANNED" &&
                      isPlantingDateDue(crop.planting_date) && (
                        <p className="mt-2 rounded-md bg-amber-50 px-2.5 py-2 text-xs leading-5 text-amber-900">
                          Planting date has arrived. Confirm it was planted,
                          then update the crop status to Planted.
                        </p>
                      )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-gray-900">
              Illustrative growth
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              Animate the crop symbols for a visual demonstration. This does
              not represent actual plant growth or predict harvest readiness.
            </p>

            <div className="mt-3 flex items-center justify-between rounded-lg bg-green-50 p-3">
              <span className="text-sm text-green-900">Visual stage</span>
              <span className="font-semibold text-green-900">
                {growthStage}/5
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAnimationPlaying((playing) => !playing)}
                className="rounded-lg bg-green-700 px-3 py-2 text-sm font-medium text-white hover:bg-green-800"
              >
                {animationPlaying ? "Pause" : "Play"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setAnimationPlaying(false);
                  setGrowthStage(0);
                }}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
              >
                Reset
              </button>
            </div>
          </section>

          <button
            type="button"
            onClick={() => void loadData()}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Reload fields and layout
          </button>
        </aside>
      </section>
      </div>
    </main>
  );
}
