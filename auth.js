const client = window.supabaseClient;
const authPanel = document.querySelector("#auth-panel");
const authForm = document.querySelector("#auth-form");
const authEmail = document.querySelector("#auth-email");
const authPassword = document.querySelector("#auth-password");
const authName = document.querySelector("#auth-display-name");
const authNameLabel = document.querySelector("#auth-name-label");
const authSubmit = document.querySelector("#auth-submit");
const authToggle = document.querySelector("#auth-toggle");
const authMessage = document.querySelector("#auth-message");
const accountPanel = document.querySelector("#account-panel");
const accountName = document.querySelector("#account-name");
const accountRole = document.querySelector("#account-role");
const setupMessage = document.querySelector("#setup-message");
const setupDetail = document.querySelector("#setup-detail");
const authSignout = document.querySelector("#auth-signout");
let mode = "signin";
let renderingSession = false;

function showAuthError(error) {
    authMessage.textContent = error?.message || "Terjadi kesalahan. Coba lagi.";
}

function setMode(nextMode) {
    mode = nextMode;
    const isSignup = mode === "signup";
    authSubmit.textContent = isSignup ? "Daftar" : "Masuk";
    authToggle.textContent = isSignup ? "Sudah punya akun? Masuk" : "Buat akun";
    authName.hidden = !isSignup;
    authNameLabel.hidden = !isSignup;
    authName.required = isSignup;
    authPassword.autocomplete = isSignup ? "new-password" : "current-password";
    authMessage.textContent = "";
}

async function tampilkanSesi(user) {
    if (!user || renderingSession) return;
    renderingSession = true;
    authPanel.hidden = true;
    accountPanel.hidden = false;
    setupMessage.hidden = false;
    setupDetail.textContent = "Memuat profil akun…";
    accountName.textContent = user.email || "Akun masuk";

    try {
        const [{ data: profile, error: profileError }, { data: memberships, error: membershipError }] = await Promise.all([
            client.from("profiles").select("display_name, is_admin").eq("user_id", user.id).maybeSingle(),
            client.from("community_memberships").select("id, role, community_id, group_id").eq("user_id", user.id),
        ]);
        if (profileError) throw profileError;
        if (membershipError) throw membershipError;

        accountName.textContent = profile?.display_name || user.email || "Akun masuk";
        const roles = new Set((memberships || []).map((membership) => membership.role));
        if (profile?.is_admin) roles.add("superadmin");
        const roleNames = {
            superadmin: "Superadmin",
            teacher: "Guru",
            student: "Santri",
        };
        accountRole.textContent = [...roles].map((role) => roleNames[role] || role).join(" · ") || "Belum diberi peran komunitas";
        setupDetail.textContent = memberships?.length
            ? `Akun ini terhubung ke ${memberships.length} keanggotaan komunitas.`
            : "Akun berhasil masuk, tetapi belum memiliki keanggotaan komunitas.";
        window.dispatchEvent(new CustomEvent("jurnal:session", {
            detail: { user, profile, memberships: memberships || [], client },
        }));
    } catch (error) {
        setupDetail.textContent = `Akun masuk, tetapi profil belum dapat dimuat: ${error.message}`;
    } finally {
        renderingSession = false;
    }
}

authToggle.addEventListener("click", () => setMode(mode === "signin" ? "signup" : "signin"));

authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    authSubmit.disabled = true;
    authMessage.textContent = mode === "signup" ? "Membuat akun…" : "Memeriksa akun…";

    try {
        if (mode === "signup") {
            const { data, error } = await client.auth.signUp({
                email: authEmail.value.trim(),
                password: authPassword.value,
                options: { data: { display_name: authName.value.trim() } },
            });
            if (error) throw error;
            if (data.session) {
                await tampilkanSesi(data.user);
            } else {
                setMode("signin");
                authMessage.textContent = "Akun dibuat. Periksa email untuk konfirmasi, lalu masuk.";
            }
        } else {
            const { data, error } = await client.auth.signInWithPassword({
                email: authEmail.value.trim(),
                password: authPassword.value,
            });
            if (error) throw error;
            await tampilkanSesi(data.user);
        }
    } catch (error) {
        showAuthError(error);
    } finally {
        authSubmit.disabled = false;
    }
});

authSignout.addEventListener("click", async () => {
    authSignout.disabled = true;
    const { error } = await client.auth.signOut();
    authSignout.disabled = false;
    if (error) {
        setupDetail.textContent = `Gagal keluar: ${error.message}`;
        return;
    }
    accountPanel.hidden = true;
    setupMessage.hidden = true;
    authPanel.hidden = false;
    authMessage.textContent = "Kamu sudah keluar.";
    setMode("signin");
});

client.auth.onAuthStateChange((_event, session) => {
    if (session?.user) void tampilkanSesi(session.user);
});

client.auth.getSession().then(({ data, error }) => {
    if (error) showAuthError(error);
    if (data.session?.user) void tampilkanSesi(data.session.user);
});

window.jurnalCloud = {
    async loadActivities(communityId) {
        const { data, error } = await client
            .from("activities")
            .select("id, name, group_name, input_type, sort_order")
            .eq("community_id", communityId)
            .eq("is_active", true)
            .order("sort_order");
        if (error) throw error;
        return data || [];
    },

    async loadDay(membershipId, communityId, date) {
        const { data: journal, error: journalError } = await client
            .from("journals")
            .select("id")
            .eq("student_membership_id", membershipId)
            .eq("community_id", communityId)
            .eq("journal_date", date)
            .maybeSingle();
        if (journalError) throw journalError;
        if (!journal) return {};

        const { data: entries, error } = await client
            .from("journal_entries")
            .select("activity_id, is_completed, quantity")
            .eq("journal_id", journal.id)
            .eq("community_id", communityId);
        if (error) throw error;

        const result = {};
        (entries || []).forEach((entry) => {
            result[entry.activity_id] = entry.quantity !== null && entry.quantity !== undefined
                ? Number(entry.quantity)
                : Boolean(entry.is_completed);
        });
        return result;
    },

    async saveDay(membershipId, communityId, date, activities, values) {
        const { data: existing, error: findError } = await client
            .from("journals")
            .select("id")
            .eq("student_membership_id", membershipId)
            .eq("community_id", communityId)
            .eq("journal_date", date)
            .maybeSingle();
        if (findError) throw findError;

        let journalId = existing?.id;
        if (journalId) {
            const { error } = await client.from("journals")
                .update({ updated_at: new Date().toISOString() })
                .eq("id", journalId)
                .eq("community_id", communityId);
            if (error) throw error;
        } else {
            const { data, error } = await client.from("journals")
                .insert({
                    student_membership_id: membershipId,
                    community_id: communityId,
                    journal_date: date,
                })
                .select("id")
                .single();
            if (error) throw error;
            journalId = data.id;
        }

        const { error: deleteError } = await client.from("journal_entries")
            .delete()
            .eq("journal_id", journalId)
            .eq("community_id", communityId);
        if (deleteError) throw deleteError;

        const entries = activities.flatMap((activity) => {
            const value = values[activity.id];
            if (activity.input_type === "quantity") {
                const quantity = Number(value) || 0;
                return quantity > 0 ? [{
                    community_id: communityId,
                    journal_id: journalId,
                    activity_id: activity.id,
                    is_completed: false,
                    quantity,
                }] : [];
            }
            return value ? [{
                community_id: communityId,
                journal_id: journalId,
                activity_id: activity.id,
                is_completed: true,
                quantity: null,
            }] : [];
        });

        if (entries.length) {
            const { error } = await client.from("journal_entries").insert(entries);
            if (error) throw error;
        }
        return values;
    },

    async loadRange(membershipId, communityId, startDate, endDate) {
        const { data: journals, error: journalError } = await client
            .from("journals")
            .select("id, journal_date")
            .eq("student_membership_id", membershipId)
            .eq("community_id", communityId)
            .gte("journal_date", startDate)
            .lte("journal_date", endDate);
        if (journalError) throw journalError;

        const result = new Map();
        (journals || []).forEach((journal) => result.set(journal.journal_date, {}));
        if (!journals?.length) return result;

        const { data: entries, error } = await client
            .from("journal_entries")
            .select("journal_id, activity_id, is_completed, quantity")
            .eq("community_id", communityId)
            .in("journal_id", journals.map((journal) => journal.id));
        if (error) throw error;

        const dateByJournal = new Map(journals.map((journal) => [journal.id, journal.journal_date]));
        (entries || []).forEach((entry) => {
            const date = dateByJournal.get(entry.journal_id);
            if (!date) return;
            const day = result.get(date) || {};
            day[entry.activity_id] = entry.quantity !== null && entry.quantity !== undefined
                ? Number(entry.quantity)
                : Boolean(entry.is_completed);
            result.set(date, day);
        });
        return result;
    },
};
