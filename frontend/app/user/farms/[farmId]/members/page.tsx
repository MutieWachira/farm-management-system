"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

/* =========================================================
   TYPES
========================================================= */

type MemberRole = "OWNER" | "MANAGER" | "MEMBER";

type FarmMember = {
  id: number;
  farm_id: number;
  user_id: number;
  role: MemberRole;

  /*
   * The backend membership response may eventually include
   * user information such as email/name.
   *
   * For now, we safely support the current API response,
   * which contains user_id.
   */
  user?: {
    id?: number;
    email?: string;
    name?: string;
  };
};

type CurrentUser = {
  id: number;
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
};

type ApiError = {
  detail?: string;
};

/* =========================================================
   CONFIGURATION
========================================================= */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

const ACCESS_TOKEN_KEY = "access_token";

/* =========================================================
   PAGE
========================================================= */

export default function FarmMembersPage() {
  const params = useParams();
  const router = useRouter();

  const farmId = String(params.farmId);

  /* -------------------------------------------------------
     STATE
  ------------------------------------------------------- */

  const [members, setMembers] = useState<FarmMember[]>([]);

  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [loading, setLoading] = useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [removingUserId, setRemovingUserId] =
    useState<number | null>(null);

  const [editingUserId, setEditingUserId] =
    useState<number | null>(null);

  const [editingRole, setEditingRole] =
    useState<MemberRole>("MEMBER");

  const [emailOrUserId, setEmailOrUserId] =
    useState("");

  const [newRole, setNewRole] =
    useState<MemberRole>("MEMBER");

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  /* =======================================================
     AUTHENTICATION
  ======================================================= */

  function getAccessToken(): string | null {
    if (typeof window === "undefined") {
      return null;
    }

    return sessionStorage.getItem(
      ACCESS_TOKEN_KEY,
    );
  }

  /* =======================================================
     API HELPER
  ======================================================= */

  async function apiRequest(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const token = getAccessToken();

    if (!token) {
      throw new Error(
        "Your session has expired. Please log in again.",
      );
    }

    const headers = new Headers(
      options.headers,
    );

    headers.set(
      "Authorization",
      `Bearer ${token}`,
    );

    if (
      options.body &&
      !headers.has("Content-Type")
    ) {
      headers.set(
        "Content-Type",
        "application/json",
      );
    }

    return fetch(
      `${API_URL}${endpoint}`,
      {
        ...options,
        headers,
        cache: "no-store",
      },
    );
  }

  /* =======================================================
     LOAD CURRENT USER
  ======================================================= */

  async function loadCurrentUser(): Promise<CurrentUser | null> {
    /*
     * Your existing AgriCore backend exposes the authenticated
     * user through the auth/current-user endpoint.
     *
     * If your existing auth endpoint has a different path,
     * change only this endpoint.
     */

    const response = await apiRequest(
      "/api/v1/auth/me",
    );

    if (!response.ok) {
      if (
        response.status === 401 ||
        response.status === 403
      ) {
        return null;
      }

      throw new Error(
        "Unable to load the current user.",
      );
    }

    return response.json();
  }

  /* =======================================================
     LOAD MEMBERS
  ======================================================= */

  async function loadMembers() {
    const response = await apiRequest(
      `/api/v1/farms/${farmId}/members`,
    );

    if (!response.ok) {
      let message =
        "Unable to load farm members.";

      try {
        const data: ApiError =
          await response.json();

        if (data.detail) {
          message = data.detail;
        }
      } catch {
        // Ignore JSON parsing errors.
      }

      throw new Error(message);
    }

    const data = await response.json();

    setMembers(
      Array.isArray(data) ? data : [],
    );
  }

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    async function loadPage() {
      try {
        setLoading(true);
        setError(null);

        const user =
          await loadCurrentUser();

        if (!mounted) {
          return;
        }

        if (!user) {
          router.push("/login");
          return;
        }

        setCurrentUser(user);

        await loadMembers();
      } catch (err) {
        if (!mounted) {
          return;
        }

        console.error(
          "Failed to load farm members:",
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong while loading farm members.",
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadPage();

    return () => {
      mounted = false;
    };
  }, [farmId]);

  /* =======================================================
     CURRENT USER ROLE
  ======================================================= */

  const currentUserMembership =
    members.find(
      (member) =>
        member.user_id === currentUser?.id,
    );

  const currentUserRole =
    currentUserMembership?.role ??
    currentUser?.role?.toUpperCase();

  const isOwner =
    currentUserRole === "OWNER";

  /* =======================================================
     DISPLAY USER
  ======================================================= */

  function getMemberDisplayName(
    member: FarmMember,
  ): string {
    if (member.user?.name) {
      return member.user.name;
    }

    if (member.user?.email) {
      return member.user.email;
    }

    return `User #${member.user_id}`;
  }

  /* =======================================================
     ADD MEMBER
  ======================================================= */

  async function handleAddMember(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!isOwner) {
      setError(
        "Only the farm owner can add members.",
      );

      return;
    }

    const value =
      emailOrUserId.trim();

    if (!value) {
      setError(
        "Enter a user ID.",
      );

      return;
    }

    const userId =
      Number(value);

    if (
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      setError(
        "Please enter a valid user ID.",
      );

      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      const response =
        await apiRequest(
          `/api/v1/farms/${farmId}/members`,
          {
            method: "POST",
            body: JSON.stringify({
              user_id: userId,
              role: newRole,
            }),
          },
        );

      if (!response.ok) {
        let message =
          "Unable to add member.";

        try {
          const data: ApiError =
            await response.json();

          if (data.detail) {
            message = data.detail;
          }
        } catch {
          // Ignore JSON parsing errors.
        }

        throw new Error(message);
      }

      await loadMembers();

      setEmailOrUserId("");
      setNewRole("MEMBER");

      setSuccess(
        "Member added successfully.",
      );
    } catch (err) {
      console.error(
        "Failed to add member:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to add member.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  /* =======================================================
     START EDITING
  ======================================================= */

  function startEditing(
    member: FarmMember,
  ) {
    if (!isOwner) {
      return;
    }

    if (member.role === "OWNER") {
      return;
    }

    setEditingUserId(
      member.user_id,
    );

    setEditingRole(
      member.role,
    );

    setError(null);
    setSuccess(null);
  }

  /* =======================================================
     CANCEL EDIT
  ======================================================= */

  function cancelEditing() {
    setEditingUserId(null);
    setEditingRole("MEMBER");
  }

  /* =======================================================
     UPDATE MEMBER
  ======================================================= */

  async function handleUpdateMember(
    userId: number,
  ) {
    if (!isOwner) {
      setError(
        "Only the farm owner can change member roles.",
      );

      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      const response =
        await apiRequest(
          `/api/v1/farms/${farmId}/members/${userId}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              role: editingRole,
            }),
          },
        );

      if (!response.ok) {
        let message =
          "Unable to update member.";

        try {
          const data: ApiError =
            await response.json();

          if (data.detail) {
            message = data.detail;
          }
        } catch {
          // Ignore JSON parsing errors.
        }

        throw new Error(message);
      }

      await loadMembers();

      cancelEditing();

      setSuccess(
        "Member role updated successfully.",
      );
    } catch (err) {
      console.error(
        "Failed to update member:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to update member.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  /* =======================================================
     REMOVE MEMBER
  ======================================================= */

  async function handleRemoveMember(
    member: FarmMember,
  ) {
    if (!isOwner) {
      setError(
        "Only the farm owner can remove members.",
      );

      return;
    }

    if (member.role === "OWNER") {
      setError(
        "The farm owner cannot be removed.",
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Remove ${getMemberDisplayName(member)} from this farm?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setRemovingUserId(
        member.user_id,
      );

      setError(null);
      setSuccess(null);

      const response =
        await apiRequest(
          `/api/v1/farms/${farmId}/members/${member.user_id}`,
          {
            method: "DELETE",
          },
        );

      if (!response.ok) {
        let message =
          "Unable to remove member.";

        try {
          const data: ApiError =
            await response.json();

          if (data.detail) {
            message = data.detail;
          }
        } catch {
          // Ignore JSON parsing errors.
        }

        throw new Error(message);
      }

      await loadMembers();

      setSuccess(
        "Member removed successfully.",
      );
    } catch (err) {
      console.error(
        "Failed to remove member:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to remove member.",
      );
    } finally {
      setRemovingUserId(null);
    }
  }

  /* =======================================================
     ROLE BADGE
  ======================================================= */

  function roleBadgeClass(
    role: MemberRole,
  ): string {
    switch (role) {
      case "OWNER":
        return "bg-purple-100 text-purple-700";

      case "MANAGER":
        return "bg-blue-100 text-blue-700";

      default:
        return "bg-slate-100 text-slate-700";
    }
  }

  /* =======================================================
     LOADING STATE
  ======================================================= */

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="animate-pulse space-y-6">
              <div className="h-8 w-48 rounded bg-slate-200" />

              <div className="h-12 w-full rounded bg-slate-200" />

              <div className="space-y-3">
                <div className="h-16 rounded bg-slate-200" />
                <div className="h-16 rounded bg-slate-200" />
                <div className="h-16 rounded bg-slate-200" />
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6">

        {/* =================================================
            HEADER
        ================================================= */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="text-sm font-medium text-slate-500">
                Farm #{farmId}
              </p>

              <h1 className="mt-1 text-2xl font-bold text-slate-900">
                Farm Members
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Manage the users who have access to this farm.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  `/dashboard/farms/${farmId}`,
                )
              }
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Back to farm
            </button>

          </div>
        </section>

        {/* =================================================
            ALERTS
        ================================================= */}

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
          >
            {success}
          </div>
        )}

        {/* =================================================
            ADD MEMBER
        ================================================= */}

        {isOwner && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-900">
                Add Member
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Add an existing AgriCore user to this farm.
              </p>
            </div>

            <form
              onSubmit={handleAddMember}
              className="grid gap-4 md:grid-cols-[1fr_180px_auto]"
            >
              <div>
                <label
                  htmlFor="user-id"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  User ID
                </label>

                <input
                  id="user-id"
                  type="number"
                  min="1"
                  value={emailOrUserId}
                  onChange={(event) =>
                    setEmailOrUserId(
                      event.target.value,
                    )
                  }
                  placeholder="Enter user ID"
                  disabled={submitting}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="member-role"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Role
                </label>

                <select
                  id="member-role"
                  value={newRole}
                  onChange={(event) =>
                    setNewRole(
                      event.target.value as MemberRole,
                    )
                  }
                  disabled={submitting}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
                >
                  <option value="MEMBER">
                    Member
                  </option>

                  <option value="MANAGER">
                    Manager
                  </option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={
                    submitting ||
                    !emailOrUserId.trim()
                  }
                  className="w-full rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
                >
                  {submitting
                    ? "Adding..."
                    : "Add Member"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* =================================================
            PERMISSION NOTICE
        ================================================= */}

        {!isOwner && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            You can view this farm's members, but only the
            farm owner can add, edit, or remove members.
          </div>
        )}

        {/* =================================================
            MEMBERS TABLE
        ================================================= */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex items-center justify-between">

              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Members
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {members.length}{" "}
                  {members.length === 1
                    ? "member"
                    : "members"}
                </p>
              </div>

            </div>
          </div>

          {members.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <h3 className="text-sm font-semibold text-slate-900">
                No members found
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                This farm currently has no membership records.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[700px] border-collapse">

                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Member
                    </th>

                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Role
                    </th>

                    {isOwner && (
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {members.map((member) => {
                    const isEditing =
                      editingUserId ===
                      member.user_id;

                    const isRemoving =
                      removingUserId ===
                      member.user_id;

                    const isMemberOwner =
                      member.role === "OWNER";

                    return (
                      <tr
                        key={member.id}
                        className="border-b border-slate-100 last:border-0"
                      >

                        {/* MEMBER */}

                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-slate-900">
                              {getMemberDisplayName(
                                member,
                              )}
                            </p>

                            <p className="mt-0.5 text-xs text-slate-500">
                              User ID:{" "}
                              {member.user_id}
                            </p>
                          </div>
                        </td>

                        {/* ROLE */}

                        <td className="px-6 py-4">
                          {isEditing ? (
                            <select
                              value={editingRole}
                              onChange={(event) =>
                                setEditingRole(
                                  event.target.value as MemberRole,
                                )
                              }
                              disabled={submitting}
                              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                            >
                              <option value="MEMBER">
                                Member
                              </option>

                              <option value="MANAGER">
                                Manager
                              </option>
                            </select>
                          ) : (
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${roleBadgeClass(
                                member.role,
                              )}`}
                            >
                              {member.role}
                            </span>
                          )}
                        </td>

                        {/* ACTIONS */}

                        {isOwner && (
                          <td className="px-6 py-4">
                            <div className="flex justify-end gap-2">

                              {isMemberOwner ? (
                                <span className="text-sm text-slate-400">
                                  —
                                </span>
                              ) : isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateMember(
                                        member.user_id,
                                      )
                                    }
                                    disabled={
                                      submitting
                                    }
                                    className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                                  >
                                    {submitting
                                      ? "Saving..."
                                      : "Save"}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={
                                      cancelEditing
                                    }
                                    disabled={
                                      submitting
                                    }
                                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      startEditing(
                                        member,
                                      )
                                    }
                                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                                  >
                                    Edit
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveMember(
                                        member,
                                      )
                                    }
                                    disabled={
                                      isRemoving
                                    }
                                    className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {isRemoving
                                      ? "Removing..."
                                      : "Remove"}
                                  </button>
                                </>
                              )}

                            </div>
                          </td>
                        )}

                      </tr>
                    );
                  })}
                </tbody>

              </table>
            </div>
          )}

        </section>

      </div>
    </main>
  );
}

