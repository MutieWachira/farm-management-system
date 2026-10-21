
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { getFields } from "@/src/lib/field-api";
import {
  createIrrigationRecord,
  deleteIrrigationRecord,
  getIrrigationRecords,
} from "@/src/lib/irrigation-api";
import { getAccessToken } from "@/src/lib/auth_storage";
import {
  createFarmActivity,
  getFarmActivities,
} from "@/src/lib/farm-activity-api";

import type { Field } from "@/src/types/field";
import type {
  CreateFarmActivityRequest,
  FarmActivity,
} from "@/src/types/farm-activity";
import type {
  CreateIrrigationRecordRequest,
  IrrigationRecord,
} from "@/src/types/irrigation-record";

type ActiveIrrigation = {
  startedAt: number;
  method: string;
};

type ActiveTankFill = {
  startedAt: number;
  startingLevel: number;
  capacity: number;
};

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

const DEFAULT_TANK_CAPACITY_LITERS = 5000;
const INITIAL_TANK_LEVEL_LITERS = 3200;
const TANK_FILL_RATE_LITERS_PER_MINUTE = 30;
const IRRIGATION_RATE_LITERS_PER_MINUTE = 12;

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

export default function IrrigationPage() {
  const params = useParams<{ farmId: string }>();
  const farmId = params.farmId;
  const router = useRouter();

  const [fields, setFields] = useState<Field[]>([]);
  const [records, setRecords] = useState<IrrigationRecord[]>([]);
  const [tankFillRecords, setTankFillRecords] = useState<FarmActivity[]>([]);
  const [tankCapacity, setTankCapacity] = useState(
    DEFAULT_TANK_CAPACITY_LITERS,
  );
  const [tankLevel, setTankLevel] = useState(INITIAL_TANK_LEVEL_LITERS);
  const [tankStateFarmId, setTankStateFarmId] = useState<string | null>(null);
  const [tankFilling, setTankFilling] = useState(false);
  const [activeTankFill, setActiveTankFill] =
    useState<ActiveTankFill | null>(null);
  const [savingTankFill, setSavingTankFill] = useState(false);
  const [pendingTankFill, setPendingTankFill] =
    useState<CreateFarmActivityRequest | null>(null);
  const [activeIrrigation, setActiveIrrigation] = useState<
    Record<string, ActiveIrrigation>
  >({});
  const [pendingIrrigation, setPendingIrrigation] = useState<
    Record<string, CreateIrrigationRecordRequest>
  >({});
  const [irrigationMethod, setIrrigationMethod] = useState("Drip");
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [savingFieldIds, setSavingFieldIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [fieldsError, setFieldsError] = useState("");
  const [success, setSuccess] = useState("");
  const storageErrorReported = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const savedState = window.localStorage.getItem(
          `irrigation-tank:${farmId}`,
        );

        if (savedState) {
          const parsedState: unknown = JSON.parse(savedState);

          if (
            typeof parsedState !== "object" ||
            parsedState === null ||
            !("capacity" in parsedState) ||
            !("level" in parsedState) ||
            typeof parsedState.capacity !== "number" ||
            typeof parsedState.level !== "number" ||
            !Number.isFinite(parsedState.capacity) ||
            !Number.isFinite(parsedState.level) ||
            parsedState.capacity <= 0 ||
            parsedState.level < 0 ||
            parsedState.level > parsedState.capacity
          ) {
            throw new Error("Saved tank level is invalid.");
          }

          setTankCapacity(parsedState.capacity);
          setTankLevel(parsedState.level);
        }
      } catch (err) {
        setError(
          `Unable to restore the saved tank level: ${errorMessage(err)}`,
        );
      } finally {
        setTankStateFarmId(farmId);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [farmId]);

  useEffect(() => {
    if (tankStateFarmId !== farmId) return;

    try {
      window.localStorage.setItem(
        `irrigation-tank:${farmId}`,
        JSON.stringify({ capacity: tankCapacity, level: tankLevel }),
      );
      storageErrorReported.current = false;
    } catch (err) {
      if (!storageErrorReported.current) {
        storageErrorReported.current = true;
        const message = errorMessage(err);
        queueMicrotask(() => {
          setError(`Unable to save the tank level: ${message}`);
        });
      }
    }
  }, [farmId, tankCapacity, tankLevel, tankStateFarmId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [fieldsResult, recordsResult, activitiesResult] =
        await Promise.allSettled([
        getFields(farmId),
        getIrrigationRecords(farmId),
        getFarmActivities(farmId),
      ]);

      const errors: string[] = [];

      if (fieldsResult.status === "fulfilled") {
        setFields(fieldsResult.value);
        setFieldsError("");
      } else {
        const message = errorMessage(fieldsResult.reason);
        setFieldsError(message);
        errors.push(`Unable to load farm fields: ${message}`);
      }

      if (recordsResult.status === "fulfilled") {
        setRecords(recordsResult.value);
      } else {
        setRecords([]);
        errors.push(
          `Unable to load irrigation history: ${errorMessage(recordsResult.reason)}`,
        );
      }

      if (activitiesResult.status === "fulfilled") {
        setTankFillRecords(
          activitiesResult.value.filter(
            (activity) => activity.title === "Water tank filling session",
          ),
        );
      } else {
        errors.push(
          `Unable to load tank filling history: ${errorMessage(activitiesResult.reason)}`,
        );
      }

      setError(errors.join(" "));
    } finally {
      setLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }

    const timer = window.setTimeout(() => void loadData(), 0);

    return () => window.clearTimeout(timer);
  }, [loadData, router]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClockNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const activeFieldCount = Object.keys(activeIrrigation).length;

    if (
      tankStateFarmId !== farmId ||
      (!tankFilling && activeFieldCount === 0)
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setTankLevel((currentLevel) =>
        Math.min(
          tankCapacity,
          Math.max(
            0,
            currentLevel +
              (tankFilling ? TANK_FILL_RATE_LITERS_PER_MINUTE / 60 : 0) -
              (activeFieldCount * IRRIGATION_RATE_LITERS_PER_MINUTE) / 60,
          ),
        ),
      );
    }, 1000);

    return () => window.clearInterval(timer);
  }, [activeIrrigation, farmId, tankCapacity, tankFilling, tankStateFarmId]);

  const fieldNames = useMemo(
    () => new Map(fields.map((field) => [field.id, field.name])),
    [fields],
  );

  const totalWater = useMemo(
    () =>
      records.reduce(
        (total, record) => total + Number(record.water_volume_liters),
        0,
      ),
    [records],
  );

  const totalMinutes = useMemo(
    () =>
      records.reduce(
        (total, record) => total + Number(record.duration_minutes),
        0,
      ),
    [records],
  );

  const sortedRecords = useMemo(
    () =>
      [...records].sort(
        (a, b) =>
          new Date(b.irrigation_date).getTime() -
          new Date(a.irrigation_date).getTime(),
      ),
    [records],
  );
  const tankLevelPercent = Math.min(
    100,
    Math.round((tankLevel / tankCapacity) * 100),
  );

  async function toggleFieldIrrigation(fieldId: string) {
    const activeSession = activeIrrigation[fieldId];

    if (!activeSession) {
      if (pendingIrrigation[fieldId]) {
        setError(
          "Save the stopped irrigation session before starting a new one on this field.",
        );
        return;
      }

      if (tankLevel <= 0) {
        setError("The water tank is empty. Turn on tank filling before irrigating.");
        return;
      }

      setError("");
      setSuccess("");
      setActiveIrrigation((current) => ({
        ...current,
        [fieldId]: {
          startedAt: clockNow,
          method: irrigationMethod,
        },
      }));
      return;
    }

    if (savingFieldIds.includes(fieldId)) {
      return;
    }

    const elapsedMinutes = Math.max(
      1 / 60,
      (clockNow - activeSession.startedAt) / 60_000,
    );
    const duration = Math.max(1, Math.ceil(elapsedMinutes));
    const estimatedWater = Math.max(
      1,
      Math.round(elapsedMinutes * IRRIGATION_RATE_LITERS_PER_MINUTE),
    );
    const startedAt = new Date(activeSession.startedAt);
    const irrigationDate = [
      startedAt.getFullYear(),
      String(startedAt.getMonth() + 1).padStart(2, "0"),
      String(startedAt.getDate()).padStart(2, "0"),
    ].join("-");

    const payload: CreateIrrigationRecordRequest = {
      field_id: fieldId,
      irrigation_date: irrigationDate,
      method: activeSession.method,
      duration_minutes: duration,
      water_volume_liters: estimatedWater,
      notes: `Automatically recorded from the irrigation simulator; water use estimated at ${IRRIGATION_RATE_LITERS_PER_MINUTE} L/min.`,
    };

    setActiveIrrigation((current) => {
      const next = { ...current };
      delete next[fieldId];
      return next;
    });
    await saveIrrigationRecord(fieldId, payload);
  }

  async function saveIrrigationRecord(
    fieldId: string,
    payload: CreateIrrigationRecordRequest,
  ) {
    setSavingFieldIds((current) =>
      current.includes(fieldId) ? current : [...current, fieldId],
    );
    setError("");
    setSuccess("");

    try {
      await createIrrigationRecord(farmId, payload);
      setPendingIrrigation((current) => {
        const next = { ...current };
        delete next[fieldId];
        return next;
      });
      setSuccess(
        `Irrigation for ${fieldNames.get(fieldId) ?? "field"} was recorded.`,
      );
      await loadData();
    } catch (err) {
      setPendingIrrigation((current) => ({
        ...current,
        [fieldId]: payload,
      }));
      setError(errorMessage(err));
    } finally {
      setSavingFieldIds((current) =>
        current.filter((id) => id !== fieldId),
      );
    }
  }

  async function saveTankFillRecord(payload: CreateFarmActivityRequest) {
    setSavingTankFill(true);
    setError("");

    try {
      await createFarmActivity(farmId, payload);
      setPendingTankFill(null);
      setSuccess("Tank filling session recorded.");
      await loadData();
    } catch (err) {
      setPendingTankFill(payload);
      setError(
        `The tank stopped filling, but its session could not be recorded: ${errorMessage(err)}`,
      );
    } finally {
      setSavingTankFill(false);
    }
  }

  function toggleTankFilling() {
    if (savingTankFill) return;

    if (!tankFilling) {
      if (pendingTankFill) return;

      setError("");
      setSuccess("");
      setActiveTankFill({
        startedAt: Date.now(),
        startingLevel: tankLevel,
        capacity: tankCapacity,
      });
      setTankFilling(true);
      return;
    }

    const session = activeTankFill;
    setTankFilling(false);
    setActiveTankFill(null);

    if (!session) return;

    const endedAt = Date.now();
    const elapsedSeconds = Math.max(
      1,
      Math.round((endedAt - session.startedAt) / 1000),
    );
    const volumeLiters = Math.max(
      0.01,
      Math.min(
        session.capacity - session.startingLevel,
        (elapsedSeconds / 60) * TANK_FILL_RATE_LITERS_PER_MINUTE,
      ),
    );
    const startedDate = new Date(session.startedAt);
    const activityDate = [
      startedDate.getFullYear(),
      String(startedDate.getMonth() + 1).padStart(2, "0"),
      String(startedDate.getDate()).padStart(2, "0"),
    ].join("-");

    void saveTankFillRecord({
      activity_type: "OTHER",
      activity_date: activityDate,
      title: "Water tank filling session",
      description: `Tank filling ran for ${elapsedSeconds} seconds. Estimated fill rate: ${TANK_FILL_RATE_LITERS_PER_MINUTE} L/min.`,
      quantity: volumeLiters,
      unit: "litres",
    });
  }

  async function handleDelete(record: IrrigationRecord) {
    const confirmed = window.confirm(
      "Delete this irrigation record? This action cannot be undone.",
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setDeletingId(record.id);

    try {
      await deleteIrrigationRecord(farmId, record.id);

      setSuccess("Irrigation record deleted successfully.");
      await loadData();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href={`/user/farms/${farmId}`}
              className="text-sm font-medium text-emerald-700 hover:text-emerald-900"
            >
              ← Back to farm
            </Link>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
              Irrigation management
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              Record water usage and track irrigation activities across your
              farm fields.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Refresh records
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            {success}
          </div>
        )}

        {tankStateFarmId === farmId && tankLevelPercent <= 10 && (
          <div
            role="alert"
            className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950"
          >
            Low water alert: the tank is at {tankLevelPercent}%. Turn on tank
            filling soon.
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-3">
          <SummaryCard
            label="Irrigation records"
            value={loading ? "—" : records.length.toLocaleString()}
            detail="Recorded activities"
          />
          <SummaryCard
            label="Total water recorded"
            value={
              loading
                ? "—"
                : `${totalWater.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })} L`
            }
            detail="Across all listed records"
          />
          <SummaryCard
            label="Total irrigation time"
            value={
              loading
                ? "—"
                : `${totalMinutes.toLocaleString()} min`
            }
            detail={
              loading
                ? "Loading totals"
                : `${Math.floor(totalMinutes / 60)} hours and ${
                    totalMinutes % 60
                  } minutes`
            }
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">
                Water supply
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Tank level
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Simulator level changes as the tank fills and fields use water.
              </p>
            </div>

            <div className="mt-6 flex items-center gap-6">
              <div
                className="relative h-56 w-36 shrink-0 overflow-hidden rounded-b-[2rem] rounded-t-xl border-4 border-slate-300 bg-slate-50 shadow-inner"
                role="img"
                aria-label={`Water tank ${tankLevelPercent}% full`}
              >
                <div className="absolute inset-x-0 top-0 z-10 h-3 rounded-t bg-slate-400" />
                <div
                  className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-sky-600 to-cyan-400 transition-[height] duration-1000 ${
                    tankFilling ? "after:absolute after:inset-0 after:animate-pulse after:bg-white/10" : ""
                  }`}
                  style={{ height: `${tankLevelPercent}%` }}
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-cyan-100/80" />
                  {tankFilling && (
                    <>
                      <span className="absolute bottom-6 left-5 h-2 w-2 animate-bounce rounded-full bg-white/70" />
                      <span className="absolute bottom-12 right-6 h-1.5 w-1.5 animate-bounce rounded-full bg-white/60 [animation-delay:200ms]" />
                    </>
                  )}
                </div>
                {tankFilling && (
                  <div
                    className="absolute -top-2 right-5 z-20 h-12 w-1 rounded-full bg-sky-400/80 animate-pulse"
                    aria-hidden="true"
                  />
                )}
                <span className="absolute inset-0 z-10 flex items-center justify-center text-lg font-bold text-slate-800 [text-shadow:0_1px_3px_white]">
                  {tankLevelPercent}%
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-3xl font-bold tabular-nums text-slate-900">
                  {Math.round(tankLevel).toLocaleString()}{" "}
                  <span className="text-base font-semibold text-slate-500">
                    L
                  </span>
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  of {tankCapacity.toLocaleString()} L capacity
                </p>
                <label className="mt-5 block text-xs font-semibold text-slate-600">
                  Tank capacity
                  <select
                    value={tankCapacity}
                    onChange={(event) => {
                      const capacity = Number(event.target.value);
                      setTankCapacity(capacity);
                      setTankLevel((current) => Math.min(current, capacity));
                    }}
                    className={inputClass}
                  >
                    <option value={2000}>2,000 L</option>
                    <option value={5000}>5,000 L</option>
                    <option value={10000}>10,000 L</option>
                    <option value={20000}>20,000 L</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-4 border-t border-slate-100 pt-5">
              <div>
                <p className="font-semibold text-slate-900">Fill tank</p>
                <p className="text-xs text-slate-500">
                  Adds {TANK_FILL_RATE_LITERS_PER_MINUTE} L per minute
                </p>
              </div>
              <Switch
                label="Fill tank"
                checked={tankFilling}
                disabled={
                  savingTankFill ||
                  (!tankFilling &&
                    (tankLevel >= tankCapacity || pendingTankFill !== null))
                }
                onChange={toggleTankFilling}
              />
            </div>
            {savingTankFill && (
              <p className="mt-3 text-sm font-medium text-sky-700" role="status">
                Recording tank filling session…
              </p>
            )}
            {pendingTankFill && !savingTankFill && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                <span>Tank stopped, but its session is not saved yet.</span>
                <button
                  type="button"
                  onClick={() => void saveTankFillRecord(pendingTankFill)}
                  className="font-semibold underline"
                >
                  Retry recording
                </button>
              </div>
            )}
            {tankFilling && tankLevel >= tankCapacity ? (
              <p className="mt-3 text-sm font-medium text-emerald-700" role="status">
                Tank full; filling paused.
              </p>
            ) : tankFilling ? (
              <p className="mt-3 text-sm font-medium text-sky-700" role="status">
                Tank filling…
              </p>
            ) : null}
            {tankLevel <= 0 && (
              <p className="mt-3 text-sm font-medium text-amber-800" role="status">
                Tank is empty. Fill it before starting another field.
              </p>
            )}
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                  Field controls
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  Irrigation switches
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Switch a field on to start; switch it off to save its session
                  automatically.
                </p>
              </div>
              <label className="block shrink-0 text-xs font-semibold text-slate-600">
                Method for new sessions
                <select
                  value={irrigationMethod}
                  onChange={(event) => setIrrigationMethod(event.target.value)}
                  className={inputClass}
                >
                  <option value="Drip">Drip irrigation</option>
                  <option value="Sprinkler">Sprinkler</option>
                  <option value="Furrow">Furrow irrigation</option>
                  <option value="Flood">Flood irrigation</option>
                  <option value="Manual">Manual watering</option>
                </select>
              </label>
            </div>

            {loading && fields.length === 0 ? (
              <p className="mt-6 text-sm text-slate-500">Loading farm fields…</p>
            ) : fieldsError && fields.length === 0 ? (
              <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-800">
                Farm fields could not be loaded. Use “Refresh records” to try
                again.
              </div>
            ) : fields.length === 0 ? (
              <div className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                Add a farm field before starting irrigation.
              </div>
            ) : (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {fields.map((field) => {
                  const active = activeIrrigation[field.id];
                  const elapsedSeconds = active
                    ? Math.max(0, Math.floor((clockNow - active.startedAt) / 1000))
                    : 0;
                  const elapsedLabel = `${Math.floor(elapsedSeconds / 60)
                    .toString()
                    .padStart(2, "0")}:${(elapsedSeconds % 60)
                    .toString()
                    .padStart(2, "0")}`;

                  return (
                    <div
                      key={field.id}
                      className={`flex items-center justify-between gap-4 rounded-xl border p-4 transition ${
                        active
                          ? "border-emerald-200 bg-emerald-50/70"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">
                          {field.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {active
                            ? `Running ${elapsedLabel} · ${active.method}`
                            : `${IRRIGATION_RATE_LITERS_PER_MINUTE} L/min estimated`}
                        </p>
                        {savingFieldIds.includes(field.id) && (
                          <p className="mt-1 text-xs font-medium text-emerald-700">
                            Saving irrigation record…
                          </p>
                        )}
                        {pendingIrrigation[field.id] && (
                          <button
                            type="button"
                            onClick={() =>
                              void saveIrrigationRecord(
                                field.id,
                                pendingIrrigation[field.id],
                              )
                            }
                            className="mt-2 text-xs font-semibold text-amber-800 underline"
                          >
                            Retry saving stopped session
                          </button>
                        )}
                      </div>
                      <Switch
                        label={`${active ? "Stop" : "Start"} irrigation for ${field.name}`}
                        checked={Boolean(active)}
                        disabled={
                          savingFieldIds.includes(field.id) ||
                          Boolean(pendingIrrigation[field.id]) ||
                          (!active && (loading || tankLevel <= 0))
                        }
                        onChange={() => void toggleFieldIrrigation(field.id)}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            <p className="mt-4 text-xs leading-5 text-slate-500">
              Simulator estimate: {IRRIGATION_RATE_LITERS_PER_MINUTE} L/min
              per active field. The recorded volume is an estimate, not a
              hardware meter reading.
            </p>
          </article>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
            <h2 className="text-xl font-bold text-slate-900">
              Tank filling history
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Tank fill sessions are recorded automatically when filling is
              switched off.
            </p>
          </div>
          {tankFillRecords.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">
              No tank filling sessions have been recorded yet.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {tankFillRecords.slice(0, 10).map((record) => (
                <li
                  key={record.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 text-sm sm:px-7"
                >
                  <span className="font-medium text-slate-800">
                    {record.activity_date.slice(0, 10)}
                  </span>
                  <span className="text-slate-600">
                    {record.quantity?.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}{" "}
                    {record.unit ?? "litres"} estimated
                  </span>
                  <span className="text-slate-500">
                    {record.description}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
            <h2 className="text-xl font-bold text-slate-900">
              Irrigation history
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Sessions are recorded automatically when a field irrigation
              switch is turned off.
            </p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Loading irrigation records...
            </div>
          ) : records.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-3xl" aria-hidden="true">
                💧
              </div>
              <h3 className="mt-3 font-semibold text-slate-900">
                No irrigation records yet
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Turn on a field irrigation switch and turn it off to save the
                first session.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 font-semibold">Field</th>
                    <th className="px-5 py-3 font-semibold">Method</th>
                    <th className="px-5 py-3 font-semibold">Duration</th>
                    <th className="px-5 py-3 font-semibold">Water</th>
                    <th className="px-5 py-3 font-semibold">Notes</th>
                    <th className="px-5 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {sortedRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                        {record.irrigation_date.slice(0, 10)}
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-900">
                        {fieldNames.get(record.field_id) ?? "Unknown field"}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {record.method}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                        {record.duration_minutes} min
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                        {Number(record.water_volume_liters).toLocaleString()} L
                      </td>
                      <td className="max-w-56 px-5 py-4 text-slate-600">
                        <span className="line-clamp-2">
                          {record.notes || "—"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => void handleDelete(record)}
                            disabled={deletingId !== null}
                            className="font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
                          >
                            {deletingId === record.id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-3 break-words text-2xl font-bold text-slate-900">
        {value}
      </p>
      <p className="mt-2 text-xs text-slate-500">{detail}</p>
    </article>
  );
}

function Switch({
  label,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-emerald-600" : "bg-slate-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
      <span className="sr-only">{checked ? "On" : "Off"}</span>
    </button>
  );
}
