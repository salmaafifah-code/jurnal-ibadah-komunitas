const rolePanel = document.querySelector("#role-panel");
const roleTitle = document.querySelector("#role-title");
const roleContent = document.querySelector("#role-content");

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function field(labelText, control) {
  const wrapper = el("label", undefined, "role-field");
  wrapper.append(el("span", labelText), control);
  return wrapper;
}

function input(type, placeholder = "") {
  const node = document.createElement("input");
  node.type = type;
  if (placeholder) node.placeholder = placeholder;
  return node;
}

function select(options, placeholder) {
  const node = document.createElement("select");
  if (placeholder) {
    const first = document.createElement("option");
    first.value = "";
    first.textContent = placeholder;
    node.append(first);
  }
  options.forEach(({ value, label }) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    node.append(option);
  });
  return node;
}

function status(node, message, error = false) {
  node.textContent = message;
  node.className = error ? "role-status error" : "role-status";
}

function today() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

async function renderAdmin({ client, profile }) {
  roleTitle.textContent = `Panel superadmin${profile?.display_name ? ` · ${profile.display_name}` : ""}`;
  roleContent.replaceChildren();
  const statusLine = el("p", "Memuat data komunitas…", "role-status");
  roleContent.append(statusLine);

  const communitySection = el("section", undefined, "role-card");
  communitySection.append(el("h2", "Komunitas"));
  const createCommunity = document.createElement("form");
  createCommunity.className = "role-form";
  const communityName = input("text", "Nama komunitas");
  communityName.required = true;
  const createCommunityButton = el("button", "Buat komunitas");
  createCommunityButton.type = "submit";
  createCommunity.append(field("Nama komunitas", communityName), createCommunityButton);
  const communityStatus = el("p", "", "role-status");
  communitySection.append(createCommunity, communityStatus);
  roleContent.append(communitySection);

  const managementSection = el("section", undefined, "role-card");
  managementSection.append(el("h2", "Kelola kelompok dan akun"));
  const communitySelect = select([], "Pilih komunitas");
  const management = el("div", undefined, "role-management");
  managementSection.append(field("Komunitas", communitySelect), management);
  roleContent.append(managementSection);

  async function loadCommunities(preferredId) {
    const { data, error } = await client.from("communities").select("id,name").order("name");
    if (error) throw error;
    communitySelect.replaceChildren(...[
      Object.assign(document.createElement("option"), { value: "", textContent: "Pilih komunitas" }),
      ...(data || []).map((community) => Object.assign(document.createElement("option"), {
        value: community.id, textContent: community.name,
      })),
    ]);
    communitySelect.value = preferredId || data?.[0]?.id || "";
    await renderCommunityManager();
  }

  createCommunity.addEventListener("submit", async (event) => {
    event.preventDefault();
    createCommunityButton.disabled = true;
    try {
      const { data, error } = await client.from("communities")
        .insert({ name: communityName.value.trim() }).select("id").single();
      if (error) throw error;
      communityName.value = "";
      status(communityStatus, "Komunitas berhasil dibuat.");
      await loadCommunities(data.id);
    } catch (error) {
      status(communityStatus, `Gagal membuat komunitas: ${error.message}`, true);
    } finally {
      createCommunityButton.disabled = false;
    }
  });

  communitySelect.addEventListener("change", renderCommunityManager);

  async function renderCommunityManager() {
    management.replaceChildren();
    const communityId = communitySelect.value;
    if (!communityId) {
      management.append(el("p", "Buat atau pilih komunitas terlebih dahulu."));
      return;
    }

    const { data: groups, error: groupsError } = await client.from("community_groups")
      .select("id,name").eq("community_id", communityId).order("name");
    if (groupsError) {
      management.append(el("p", `Daftar kelompok gagal dimuat: ${groupsError.message}`, "role-status error"));
      return;
    }
    const groupOptions = (groups || []).map((group) => ({ value: group.id, label: group.name }));
    const groupForm = document.createElement("form");
    groupForm.className = "role-form role-inline-form";
    const groupName = input("text", "Nama kelompok baru");
    groupName.required = true;
    const addGroupButton = el("button", "Tambah kelompok");
    addGroupButton.type = "submit";
    groupForm.append(field("Tambah kelompok", groupName), addGroupButton);
    const groupStatus = el("p", "", "role-status");
    groupForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      addGroupButton.disabled = true;
      const { error } = await client.from("community_groups")
        .insert({ community_id: communityId, name: groupName.value.trim() });
      addGroupButton.disabled = false;
      if (error) return status(groupStatus, `Kelompok gagal dibuat: ${error.message}`, true);
      status(groupStatus, "Kelompok berhasil ditambahkan.");
      await renderCommunityManager();
    });
    management.append(groupForm, groupStatus, el("h3", "Kelompok tersedia"));
    management.append(groupOptions.length
      ? el("ul", undefined, "role-list")
      : el("p", "Belum ada kelompok."));
    const groupList = management.querySelector("ul");
    groupOptions.forEach(({ label }) => groupList?.append(el("li", label)));

    const { data: profiles, error: profilesError } = await client.from("profiles")
      .select("user_id,display_name,email").order("display_name");
    if (profilesError) {
      management.append(el("p", `Daftar akun belum bisa dibaca: ${profilesError.message}`, "role-status error"));
      return;
    }
    management.append(el("h3", "Tambahkan akun yang sudah mendaftar"));
    const userSelect = select((profiles || []).map((item) => ({
      value: item.user_id,
      label: `${item.display_name || "Tanpa nama"} · ${item.email || item.user_id}`,
    })), "Pilih akun");
    userSelect.required = true;
    const roleSelect = select([
      { value: "student", label: "Santri" },
      { value: "teacher", label: "Guru" },
    ]);
    const groupSelect = select(groupOptions, "Pilih kelompok santri");
    groupSelect.required = true;
    const addMemberForm = document.createElement("form");
    addMemberForm.className = "role-form";
    const groupField = field("Kelompok santri / penugasan guru", groupSelect);
    const addMemberButton = el("button", "Tambahkan ke komunitas");
    addMemberButton.type = "submit";
    addMemberForm.append(field("Akun", userSelect), field("Peran", roleSelect), groupField, addMemberButton);
    const memberStatus = el("p", "Akun harus mendaftar dan mengonfirmasi email lebih dulu.", "role-status");
    addMemberForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!userSelect.value || !groupSelect.value) {
        return status(memberStatus, "Pilih akun dan kelompok untuk santri atau penugasan guru.", true);
      }
      addMemberButton.disabled = true;
      try {
        const { data: existing, error: existingError } = await client.from("community_memberships")
          .select("id").eq("community_id", communityId).eq("user_id", userSelect.value).eq("role", roleSelect.value);
        if (existingError) throw existingError;
        if (existing?.length) throw new Error("Akun ini sudah memiliki peran tersebut di komunitas ini.");
        const { data: membership, error } = await client.from("community_memberships")
          .insert({
            community_id: communityId,
            user_id: userSelect.value,
            role: roleSelect.value,
            group_id: roleSelect.value === "student" ? groupSelect.value : null,
          }).select("id").single();
        if (error) throw error;
        if (roleSelect.value === "teacher") {
          if (!groupSelect.value) throw new Error("Pilih kelompok untuk penugasan guru.");
          const { error: assignmentError } = await client.from("teacher_group_assignments")
            .insert({ community_id: communityId, teacher_membership_id: membership.id, group_id: groupSelect.value });
          if (assignmentError) throw assignmentError;
        }
        status(memberStatus, "Akun berhasil ditambahkan ke komunitas.");
      } catch (error) {
        status(memberStatus, `Gagal menambahkan akun: ${error.message}`, true);
      } finally {
        addMemberButton.disabled = false;
      }
    });
    management.append(addMemberForm, memberStatus);
  }

  try {
    await loadCommunities();
    status(statusLine, "Kelola komunitas dan tetapkan akun yang sudah mendaftar.");
  } catch (error) {
    status(statusLine, `Data komunitas gagal dimuat: ${error.message}`, true);
  }
}

async function renderTeacher({ client, memberships, profile }) {
  roleTitle.textContent = `Panel guru${profile?.display_name ? ` · ${profile.display_name}` : ""}`;
  roleContent.replaceChildren();
  const panel = el("section", undefined, "role-card");
  panel.append(el("h2", "Pantau jurnal santri"), el("p", "Pilih kelompok dan tanggal untuk melihat jurnal santri binaan."));
  const statusLine = el("p", "Memuat kelompok binaan…", "role-status");
  roleContent.append(panel, statusLine);
  const teacherMemberships = memberships.filter((item) => item.role === "teacher");

  try {
    const assignments = [];
    for (const membership of teacherMemberships) {
      const { data, error } = await client.from("teacher_group_assignments")
        .select("group_id").eq("community_id", membership.community_id)
        .eq("teacher_membership_id", membership.id);
      if (error) throw error;
      (data || []).forEach((assignment) => assignments.push({ ...assignment, community_id: membership.community_id }));
    }
    if (!assignments.length) {
      status(statusLine, "Akun guru belum diberi kelompok binaan oleh superadmin.", true);
      return;
    }
    const ids = [...new Set(assignments.map((item) => item.group_id))];
    const { data: groups, error: groupError } = await client.from("community_groups")
      .select("id,community_id,name").in("id", ids).order("name");
    if (groupError) throw groupError;
    const groupSelect = select((groups || []).map((group) => ({
      value: group.id,
      label: group.name,
    })), "Pilih kelompok");
    const dateInput = input("date");
    dateInput.value = today();
    const loadButton = el("button", "Tampilkan jurnal");
    loadButton.type = "button";
    const controls = el("div", undefined, "role-form role-inline-form");
    controls.append(field("Kelompok", groupSelect), field("Tanggal", dateInput), loadButton);
    const results = el("div", undefined, "teacher-results");
    panel.append(controls, results);

    async function loadGroupJournal() {
      results.replaceChildren(el("p", "Memuat jurnal…", "role-status"));
      loadButton.disabled = true;
      try {
        const group = groups.find((item) => item.id === groupSelect.value);
        const groupAssignment = assignments.find((item) => item.group_id === group.id);
        const { data: students, error: studentError } = await client.from("community_memberships")
          .select("id,user_id,group_id").eq("community_id", group.community_id)
          .eq("group_id", group.id).eq("role", "student");
        if (studentError) throw studentError;
        const profileIds = (students || []).map((student) => student.user_id);
        const { data: profiles, error: profileError } = profileIds.length
          ? await client.from("profiles").select("user_id,display_name").in("user_id", profileIds)
          : { data: [], error: null };
        if (profileError) throw profileError;
        const { data: journals, error: journalError } = students?.length
          ? await client.from("journals").select("id,student_membership_id,journal_date")
            .eq("community_id", group.community_id).eq("journal_date", dateInput.value)
            .in("student_membership_id", students.map((student) => student.id))
          : { data: [], error: null };
        if (journalError) throw journalError;
        const journalIds = (journals || []).map((journal) => journal.id);
        const { data: entries, error: entriesError } = journalIds.length
          ? await client.from("journal_entries").select("journal_id,activity_id,is_completed,quantity")
            .eq("community_id", group.community_id).in("journal_id", journalIds)
          : { data: [], error: null };
        if (entriesError) throw entriesError;
        const { data: activities, error: activitiesError } = await client.from("activities")
          .select("id,name,input_type").eq("community_id", group.community_id).eq("is_active", true).order("sort_order");
        if (activitiesError) throw activitiesError;
        const profileByUser = new Map((profiles || []).map((item) => [item.user_id, item.display_name || "Santri"]));
        const journalByStudent = new Map((journals || []).map((journal) => [journal.student_membership_id, journal]));
        const entriesByJournal = new Map();
        (entries || []).forEach((entry) => {
          if (!entriesByJournal.has(entry.journal_id)) entriesByJournal.set(entry.journal_id, []);
          entriesByJournal.get(entry.journal_id).push(entry);
        });
        results.replaceChildren();
        if (!students?.length) {
          results.append(el("p", "Belum ada santri di kelompok ini."));
          return;
        }
        students.forEach((student) => {
          const card = el("article", undefined, "student-card");
          const studentName = profileByUser.get(student.user_id) || "Santri";
          const journal = journalByStudent.get(student.id);
          const studentEntries = journal ? entriesByJournal.get(journal.id) || [] : [];
          card.append(el("h3", studentName));
          if (!journal) {
            card.append(el("p", "Belum mengisi jurnal pada tanggal ini.", "role-muted"));
          } else {
            const list = el("ul", undefined, "student-activity-list");
            activities.forEach((activity) => {
              const entry = studentEntries.find((item) => item.activity_id === activity.id);
              const done = activity.input_type === "quantity" ? Number(entry?.quantity || 0) > 0 : Boolean(entry?.is_completed);
              list.append(el("li", `${done ? "✓" : "○"} ${activity.name}${activity.input_type === "quantity" && done ? ` · ${entry.quantity} lembar` : ""}`));
            });
            card.append(list);
            const noteForm = document.createElement("form");
            noteForm.className = "role-form";
            const note = document.createElement("textarea");
            note.rows = 2;
            note.maxLength = 1000;
            note.placeholder = "Catatan untuk jurnal hari ini";
            const noteButton = el("button", "Simpan catatan");
            noteButton.type = "submit";
            const noteStatus = el("p", "", "role-status");
            noteForm.append(field("Catatan guru", note), noteButton, noteStatus);
            noteForm.addEventListener("submit", async (event) => {
              event.preventDefault();
              const teacherMembership = teacherMemberships.find((item) => item.community_id === groupAssignment.community_id);
              const { error } = await client.from("teacher_notes").insert({
                community_id: group.community_id,
                journal_id: journal.id,
                teacher_membership_id: teacherMembership.id,
                note: note.value.trim(),
              });
              if (error) status(noteStatus, `Catatan gagal disimpan: ${error.message}`, true);
              else { note.value = ""; status(noteStatus, "Catatan tersimpan."); }
            });
            card.append(noteForm);
          }
          results.append(card);
        });
      } catch (error) {
        results.replaceChildren(el("p", `Jurnal tidak dapat dimuat: ${error.message}`, "role-status error"));
      } finally {
        loadButton.disabled = false;
      }
    }
    loadButton.addEventListener("click", loadGroupJournal);
    groupSelect.addEventListener("change", loadGroupJournal);
    await loadGroupJournal();
    status(statusLine, "Guru hanya melihat kelompok yang ditugaskan kepadanya.");
  } catch (error) {
    status(statusLine, `Kelompok binaan gagal dimuat: ${error.message}`, true);
  }
}

window.addEventListener("jurnal:session", async (event) => {
  const { profile, memberships, client } = event.detail;
  const main = document.querySelector("main");
  const setup = document.querySelector("#setup-message");
  const setupDetail = document.querySelector("#setup-detail");
  if (profile?.is_admin) {
    main.hidden = true;
    setup.hidden = true;
    rolePanel.hidden = false;
    await renderAdmin({ client, profile });
    return;
  }
  if (memberships.some((item) => item.role === "teacher")) {
    main.hidden = true;
    setup.hidden = true;
    rolePanel.hidden = false;
    await renderTeacher({ client, memberships, profile });
    return;
  }
  rolePanel.hidden = true;
  const studentMemberships = memberships.filter((item) => item.role === "student");
  if (!studentMemberships.length) {
    main.hidden = true;
    setup.hidden = false;
    setupDetail.textContent = "Akun belum diberi peran komunitas. Minta superadmin menambahkan akun ini sebagai santri atau guru.";
    return;
  }
  setup.hidden = true;
  const communitySelect = document.querySelector("#community-select");
  const ids = [...new Set(studentMemberships.map((item) => item.community_id))];
  const { data: communities, error } = await client.from("communities").select("id,name").in("id", ids);
  if (error) {
    main.hidden = true;
    setup.hidden = false;
    setupDetail.textContent = `Komunitas gagal dimuat: ${error.message}`;
    return;
  }
  const names = new Map((communities || []).map((item) => [item.id, item.name]));
  communitySelect.replaceChildren();
  studentMemberships.forEach((membership) => {
    communitySelect.append(Object.assign(document.createElement("option"), {
      value: membership.id,
      textContent: names.get(membership.community_id) || "Komunitas",
    }));
  });
  communitySelect.hidden = studentMemberships.length < 2;
  const loadStudentJournal = () => {
    const membership = studentMemberships.find((item) => item.id === communitySelect.value) || studentMemberships[0];
    void tampilkanJurnalSantri(membership, profile);
  };
  communitySelect.onchange = loadStudentJournal;
  communitySelect.value = studentMemberships[0].id;
  await tampilkanJurnalSantri(studentMemberships[0], profile);
});
