/**
 * app.js - E-Portfolio Controller
 * Manages UI rendering, user interaction, forms, file reading, and DB integration.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Database instance
  let db = null;
  
  // Cache to track created Object URLs for cleanup
  let activeObjectUrls = [];

  // Theme settings
  const themeToggleBtn = document.getElementById('theme-toggle');
  const sunIcon = themeToggleBtn.querySelector('.sun-icon');
  const moonIcon = themeToggleBtn.querySelector('.moon-icon');

  // Navigation and header elements
  const header = document.getElementById('main-header');
  const navLinks = document.querySelectorAll('nav ul li a');

  // Drawer / Overlay elements
  const adminToggle = document.getElementById('admin-toggle');
  const adminOverlay = document.getElementById('admin-overlay');
  const adminClose = document.getElementById('admin-close');
  const adminTabs = document.querySelectorAll('.admin-tab');
  const adminPanes = document.querySelectorAll('.admin-pane');

  // Profile Form elements
  const formProfile = document.getElementById('form-profile');
  const inputName = document.getElementById('input-name');
  const inputTitle = document.getElementById('input-title');
  const inputBio = document.getElementById('input-bio');
  const inputSkills = document.getElementById('input-skills');
  const avatarUploadZone = document.getElementById('avatar-upload-zone');
  const inputAvatarFile = document.getElementById('input-avatar-file');
  const avatarPreviewBox = document.getElementById('avatar-preview-box');
  const avatarPreviewImg = document.getElementById('avatar-preview-img');
  const inputGithub = document.getElementById('input-github');
  const inputGithubUsername = document.getElementById('input-github-username');
  const inputBotGreeting = document.getElementById('input-bot-greeting');
  const inputLinkedin = document.getElementById('input-linkedin');
  const inputTwitter = document.getElementById('input-twitter');

  // Achievements Form elements
  const formAchievement = document.getElementById('form-achievement');
  const inputAchId = document.getElementById('input-ach-id');
  const inputAchTitle = document.getElementById('input-ach-title');
  const inputAchDate = document.getElementById('input-ach-date');
  const inputAchDesc = document.getElementById('input-ach-desc');
  const achUploadZone = document.getElementById('ach-upload-zone');
  const inputAchFile = document.getElementById('input-ach-file');
  const achPreviewBox = document.getElementById('ach-preview-box');
  const achPreviewImg = document.getElementById('ach-preview-img');
  const btnAchSubmit = document.getElementById('btn-ach-submit');
  const btnAchCancel = document.getElementById('btn-ach-cancel');
  const adminAchievementsList = document.getElementById('admin-achievements-list');

  // Documents Form elements
  const formDocument = document.getElementById('form-document');
  const docUploadZone = document.getElementById('doc-upload-zone');
  const inputDocFile = document.getElementById('input-doc-file');
  const docFileInfo = document.getElementById('doc-file-info');
  const docSelectedName = document.getElementById('doc-selected-name');
  const btnDocSubmit = document.getElementById('btn-doc-submit');
  const adminDocumentsList = document.getElementById('admin-documents-list');

  // In-memory files caches (Base64 data strings for profile avatar and achievement cover)
  let profileAvatarBase64 = null;
  let achievementCoverBase64 = null;

  // Initialize DB
  try {
    db = new EPortfolioDB();
    await db.init();
    showToast('Portfolio loaded from database!', 'success');
  } catch (error) {
    console.error('Database initialization failed:', error);
    showToast('Failed to load database. Running in offline view.', 'error');
  }

  // Load website content and UI
  try {
    // Initial Render
    await refreshAll();
    initThreeBackground();
    initAIChatbot();
    initGithubAccountLinking();
  } catch (error) {
    console.error('UI initialization error:', error);
  }

  // Clear created object URLs to prevent memory leaks
  function clearActiveObjectUrls() {
    activeObjectUrls.forEach(url => URL.revokeObjectURL(url));
    activeObjectUrls = [];
  }

  // Refresh data and render UI
  async function refreshAll() {
    clearActiveObjectUrls();
    await loadProfile();
    await loadAchievements();
    await loadDocuments();
    if (typeof renderGithubGraph === 'function') {
      await renderGithubGraph();
    }
  }

  /* ==========================================================================
     RENDER & LOAD FUNCTIONS
     ========================================================================== */

  // Load and Render Profile
  async function loadProfile() {
    const profile = await db.getProfile();
    if (!profile) return;

    // Set form fields in Admin Dashboard
    inputName.value = profile.name || '';
    inputTitle.value = profile.title || '';
    inputBio.value = profile.bio || '';
    inputSkills.value = profile.skills ? profile.skills.join(', ') : '';
    inputGithub.value = profile.socials?.github || '';
    inputGithubUsername.value = profile.githubUsername || '';
    inputBotGreeting.value = profile.chatbotGreeting || '';
    inputLinkedin.value = profile.socials?.linkedin || '';
    inputTwitter.value = profile.socials?.twitter || '';
    
    if (profile.avatar) {
      profileAvatarBase64 = profile.avatar;
      avatarPreviewImg.src = profile.avatar;
      avatarPreviewBox.style.display = 'block';
      document.getElementById('profile-avatar').src = profile.avatar;
    }

    // Render in Public Section
    const nameEl = document.getElementById('profile-name');
    if (profile.name) {
      const parts = profile.name.trim().split(' ');
      if (parts.length > 1) {
        const mainName = parts.slice(0, -1).join(' ');
        const lastWord = parts[parts.length - 1];
        nameEl.innerHTML = `${mainName} <span>${lastWord}</span>`;
      } else {
        nameEl.innerHTML = `<span>${profile.name}</span>`;
      }

      // Update Top-Left Logo Text (e.g. Mithun N -> Mithun.N)
      const logoEl = document.getElementById('logo-text');
      if (logoEl) {
        if (parts.length > 1) {
          const firstName = parts[0];
          const lastName = parts[parts.length - 1];
          logoEl.textContent = `${firstName}.${lastName[0].toUpperCase()}`;
        } else {
          logoEl.textContent = profile.name;
        }
      }

      // Update Page Title in Browser Tab
      document.title = `${profile.name} | ${profile.title || 'E-Portfolio'}`;

      // Update Footer Copy
      const footerNameEl = document.getElementById('footer-name');
      if (footerNameEl) {
        footerNameEl.textContent = profile.name;
      }
    }

    document.getElementById('profile-title-tag').textContent = profile.title || 'Creative Specialist';
    document.getElementById('profile-bio').textContent = profile.bio || '';

    // Render Skills
    const skillsContainer = document.getElementById('profile-skills-container');
    skillsContainer.innerHTML = '';
    if (profile.skills && profile.skills.length > 0) {
      profile.skills.forEach(skill => {
        const span = document.createElement('span');
        span.className = 'skill-tag';
        span.textContent = skill.trim();
        skillsContainer.appendChild(span);
      });
    }

    // Render Social Links
    const socialsContainer = document.getElementById('profile-socials');
    socialsContainer.innerHTML = '';
    const socials = profile.socials || {};
    
    if (socials.github) {
      socialsContainer.appendChild(createSocialLink(socials.github, 'github', `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path><path d="M9 18c-4.51 2-5-2-7-2"></path></svg>
      `));
    }
    if (socials.linkedin) {
      socialsContainer.appendChild(createSocialLink(socials.linkedin, 'linkedin', `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect width="4" height="12" x="2" y="9"></rect><circle cx="4" cy="4" r="2"></circle></svg>
      `));
    }
    if (socials.twitter) {
      socialsContainer.appendChild(createSocialLink(socials.twitter, 'twitter', `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>
      `));
    }

    // Render GitHub Username on Graph Section
    const ghDisplay = document.getElementById('github-username-display');
    if (ghDisplay) {
      ghDisplay.textContent = profile.githubUsername ? `@${profile.githubUsername}` : '@alexmorgan';
    }

    // Render Chatbot Title & Avatar
    const chatTitle = document.getElementById('chatbot-title');
    if (chatTitle && profile.name) {
      chatTitle.textContent = `${profile.name} AI`;
    }
    const chatAvatar = document.getElementById('chatbot-avatar');
    if (chatAvatar && profile.avatar) {
      chatAvatar.src = profile.avatar;
    }
  }

  function createSocialLink(url, label, iconSvg) {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.className = 'btn-circle';
    a.title = `Follow on ${label}`;
    a.innerHTML = iconSvg;
    return a;
  }

  // Load and Render Achievements
  async function loadAchievements() {
    const achievements = await db.getAchievements();
    const publicContainer = document.getElementById('achievements-container');
    
    // Clear containers
    publicContainer.innerHTML = '';
    adminAchievementsList.innerHTML = '';

    if (achievements.length === 0) {
      publicContainer.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1;">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"></path><path d="M12 2a6 6 0 0 1 6 6c0 3.33-2 5.5-6 6.5-4-1-6-3.17-6-6.5a6 6 0 0 1 6-6Z"></path></svg>
          <p>No achievements added yet. Click "Manage Portfolio" to add your first milestone!</p>
        </div>
      `;
      adminAchievementsList.innerHTML = `<p class="empty-state">No achievements recorded.</p>`;
      return;
    }

    // Sort achievements by date descending
    achievements.sort((a, b) => new Date(b.date) - new Date(a.date));

    achievements.forEach(ach => {
      // 1. Render Public Card
      const card = document.createElement('article');
      card.className = 'ach-card';
      
      const formattedDate = new Date(ach.date).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      });

      card.innerHTML = `
        <div class="ach-image-container">
          <img src="${ach.image || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'}" alt="${ach.title}">
          <span class="ach-date">${formattedDate}</span>
        </div>
        <div class="ach-body">
          <h3 class="ach-title">${ach.title}</h3>
          <p class="ach-description">${ach.description}</p>
        </div>
      `;
      publicContainer.appendChild(card);

      // 2. Render Admin Row Item
      const row = document.createElement('div');
      row.className = 'admin-item-row';
      row.innerHTML = `
        <div class="admin-item-row-info">
          <img src="${ach.image || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'}" alt="Thumb">
          <div class="admin-item-row-details">
            <div class="admin-item-row-title">${ach.title}</div>
            <div class="admin-item-row-subtitle">${ach.date}</div>
          </div>
        </div>
        <div class="admin-item-row-actions">
          <button class="btn-circle edit-ach-btn" data-id="${ach.id}" title="Edit Achievement">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
          </button>
          <button class="btn-circle btn-danger delete-ach-btn" data-id="${ach.id}" title="Delete Achievement">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
          </button>
        </div>
      `;

      // Event listener for edit
      row.querySelector('.edit-ach-btn').addEventListener('click', () => {
        editAchievementMode(ach);
      });

      // Event listener for delete
      row.querySelector('.delete-ach-btn').addEventListener('click', async () => {
        if (confirm(`Are you sure you want to delete "${ach.title}"?`)) {
          await db.deleteAchievement(ach.id);
          showToast('Achievement deleted successfully!');
          if (inputAchId.value == ach.id) {
            cancelAchievementEdit();
          }
          await loadAchievements();
        }
      });

      adminAchievementsList.appendChild(row);
    });
  }

  // Load and Render Documents
  async function loadDocuments() {
    const docs = await db.getDocuments();
    const publicContainer = document.getElementById('documents-container');
    
    // Clear list
    publicContainer.innerHTML = '';
    adminDocumentsList.innerHTML = '';

    if (docs.length === 0) {
      publicContainer.innerHTML = `
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>
          <p>No documents uploaded yet. Switch to "Manage Portfolio" to upload PDF resumes or images.</p>
        </div>
      `;
      adminDocumentsList.innerHTML = `<p class="empty-state">No documents uploaded.</p>`;
      return;
    }

    docs.forEach(doc => {
      // Create clean Blob URL for downloading
      const downloadUrl = URL.createObjectURL(doc.fileBlob);
      activeObjectUrls.push(downloadUrl);

      // Determine clean icon SVG
      let fileIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path></svg>
      `; // Default generic file icon
      
      if (doc.type.includes('pdf')) {
        fileIcon = `
          <svg style="color: %23ef4444;" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="red" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M9 15h3a2 2 0 0 0 2-2v0a2 2 0 0 0-2-2H9v4Z"></path><path d="M9 11v6"></path></svg>
        `;
      } else if (doc.type.includes('image')) {
        fileIcon = `
          <svg style="color: %2310b981;" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="green" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg>
        `;
      }

      const formattedSize = formatBytes(doc.size);

      // 1. Render Public Row
      const docItem = document.createElement('div');
      docItem.className = 'doc-item';
      docItem.innerHTML = `
        <div class="doc-info">
          <div class="doc-icon-box">${fileIcon}</div>
          <div class="doc-meta">
            <div class="doc-name" title="${doc.name}">${doc.name}</div>
            <div class="doc-details">
              <span>Size: ${formattedSize}</span>
              <span>•</span>
              <span>Added: ${doc.date}</span>
            </div>
          </div>
        </div>
        <div class="doc-actions">
          <a href="${downloadUrl}" download="${doc.name}" class="btn btn-secondary" title="Download Document">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" x2="12" y1="15" y2="3"></line></svg>
            Download
          </a>
        </div>
      `;
      publicContainer.appendChild(docItem);

      // 2. Render Admin Row Item
      const row = document.createElement('div');
      row.className = 'admin-item-row';
      row.innerHTML = `
        <div class="admin-item-row-info">
          <div class="icon-ph" style="color: var(--accent-primary)">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
          </div>
          <div class="admin-item-row-details">
            <div class="admin-item-row-title">${doc.name}</div>
            <div class="admin-item-row-subtitle">${formattedSize} | ${doc.date}</div>
          </div>
        </div>
        <div class="admin-item-row-actions">
          <button class="btn-circle btn-danger delete-doc-btn" data-id="${doc.id}" title="Delete File">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
          </button>
        </div>
      `;

      row.querySelector('.delete-doc-btn').addEventListener('click', async () => {
        if (confirm(`Are you sure you want to delete "${doc.name}"?`)) {
          await db.deleteDocument(doc.id);
          showToast('Document deleted successfully!');
          await loadDocuments();
        }
      });

      adminDocumentsList.appendChild(row);
    });
  }

  /* ==========================================================================
     INTERACTIONS & CORE WEB APPS CAPABILITIES
     ========================================================================== */

  // Header Scroll Effect
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    // Scrollspy navigation highlight
    let current = '';
    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;
      if (window.scrollY >= (sectionTop - 120)) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href').slice(1) === current) {
        link.classList.add('active');
      }
    });
  });

  // Dark/Light Theme Switcher
  const savedTheme = localStorage.getItem('theme') || 'dark';
  setTheme(savedTheme);

  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  });

  function setTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    if (theme === 'light') {
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'block';
    } else {
      sunIcon.style.display = 'block';
      moonIcon.style.display = 'none';
    }
  }

  // Admin Drawer Toggling & Authentication
  const authModal = document.getElementById('auth-modal');
  const authModalClose = document.getElementById('auth-modal-close');
  const authModalCancel = document.getElementById('auth-modal-cancel');
  const authModalLogin = document.getElementById('auth-modal-login');
  const authModalTokenInput = document.getElementById('modal-auth-token');

  adminToggle.addEventListener('click', () => {
    const existingToken = sessionStorage.getItem('github_token');
    if (existingToken) {
      openAdminDrawer();
    } else {
      authModal.classList.add('active');
    }
  });

  function openAdminDrawer() {
    adminOverlay.classList.add('active');
    switchAdminTab('pane-profile');
  }

  function closeAuthModal() {
    authModal.classList.remove('active');
    authModalTokenInput.value = '';
  }

  authModalClose.addEventListener('click', closeAuthModal);
  authModalCancel.addEventListener('click', closeAuthModal);
  
  authModalLogin.addEventListener('click', () => {
    const token = authModalTokenInput.value.trim();
    if (token) {
      sessionStorage.setItem('github_token', token);
      closeAuthModal();
      openAdminDrawer();
      showToast('Logged in with GitHub Token.', 'success');
    } else {
      showToast('Please enter a valid GitHub token.', 'error');
    }
  });

  adminClose.addEventListener('click', () => {
    adminOverlay.classList.remove('active');
    cancelAchievementEdit();
  });

  adminOverlay.addEventListener('click', (e) => {
    if (e.target === adminOverlay) {
      adminOverlay.classList.remove('active');
      cancelAchievementEdit();
    }
  });

  // Admin Drawer Tabs
  adminTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const paneId = tab.getAttribute('data-pane');
      switchAdminTab(paneId);
    });
  });

  function switchAdminTab(paneId) {
    adminTabs.forEach(t => {
      if (t.getAttribute('data-pane') === paneId) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });

    adminPanes.forEach(pane => {
      if (pane.id === paneId) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });
  }

  /* ==========================================================================
     FILE UPLOAD DRAG AND DROP & PREVIEW LOGIC
     ========================================================================== */

  // Helper setup for drag & drop file selectors
  setupDragAndDrop(avatarUploadZone, inputAvatarFile, (file) => {
    readImageFile(file, (base64) => {
      profileAvatarBase64 = base64;
      avatarPreviewImg.src = base64;
      avatarPreviewBox.style.display = 'block';
      showToast('Avatar image selected!');
    });
  });

  setupDragAndDrop(achUploadZone, inputAchFile, (file) => {
    readImageFile(file, (base64) => {
      achievementCoverBase64 = base64;
      achPreviewImg.src = base64;
      achPreviewBox.style.display = 'block';
      showToast('Achievement cover image selected!');
    });
  });

  // Documents Upload Zone has a dynamic file display
  setupDragAndDrop(docUploadZone, inputDocFile, (file) => {
    docSelectedName.textContent = `${file.name} (${formatBytes(file.size)})`;
    docFileInfo.style.display = 'block';
    btnDocSubmit.style.display = 'block';
    showToast('File queued for upload!');
  });

  function setupDragAndDrop(zone, fileInput, callback) {
    zone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        callback(e.target.files[0]);
      }
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      zone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.add('dragover');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      zone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.remove('dragover');
      }, false);
    });

    zone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files.length > 0) {
        fileInput.files = files; // Sync the file input elements
        callback(files[0]);
      }
    });
  }

  // FileReader helper for images
  function readImageFile(file, callback) {
    if (!file.type.startsWith('image/')) {
      showToast('Invalid file type! Please select an image.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => callback(e.target.result);
    reader.onerror = () => showToast('Error reading image file.', 'error');
    reader.readAsDataURL(file);
  }

  /* ==========================================================================
     FORM SUBMISSIONS (PROFILE, ACHIEVEMENTS, DOCUMENTS)
     ========================================================================== */

  // 1. Profile Form Submit
  formProfile.addEventListener('submit', async (e) => {
    e.preventDefault();

    const skillsArray = inputSkills.value
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const updatedProfile = {
      name: inputName.value.trim(),
      title: inputTitle.value.trim(),
      bio: inputBio.value.trim(),
      skills: skillsArray,
      avatar: profileAvatarBase64,
      githubUsername: inputGithubUsername.value.trim(),
      chatbotGreeting: inputBotGreeting.value.trim(),
      socials: {
        github: inputGithub.value.trim(),
        linkedin: inputLinkedin.value.trim(),
        twitter: inputTwitter.value.trim()
      }
    };

    try {
      await db.saveProfile(updatedProfile);
      showToast('Profile updated successfully!', 'success');
      await loadProfile();
      if (typeof renderGithubGraph === 'function') {
        await renderGithubGraph(updatedProfile.githubUsername);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to update profile.', 'error');
    }
  });

  // 2. Achievements Form Submit
  formAchievement.addEventListener('submit', async (e) => {
    e.preventDefault();

    const achId = inputAchId.value;
    const isEdit = achId !== '';

    const achievementData = {
      title: inputAchTitle.value.trim(),
      date: inputAchDate.value,
      description: inputAchDesc.value.trim(),
      image: achievementCoverBase64
    };

    if (isEdit) {
      achievementData.id = Number(achId);
    }

    try {
      if (isEdit) {
        await db.updateAchievement(achievementData);
        showToast('Achievement updated successfully!');
      } else {
        await db.addAchievement(achievementData);
        showToast('Achievement added successfully!');
      }

      // Reset and Refresh
      cancelAchievementEdit();
      await loadAchievements();
    } catch (err) {
      console.error(err);
      showToast('Failed to save achievement.', 'error');
    }
  });

  // Edit achievement setup
  function editAchievementMode(ach) {
    inputAchId.value = ach.id;
    inputAchTitle.value = ach.title;
    inputAchDate.value = ach.date;
    inputAchDesc.value = ach.description;
    
    if (ach.image) {
      achievementCoverBase64 = ach.image;
      achPreviewImg.src = ach.image;
      achPreviewBox.style.display = 'block';
    } else {
      achievementCoverBase64 = null;
      achPreviewBox.style.display = 'none';
    }

    // Scroll form to top
    formAchievement.scrollIntoView({ behavior: 'smooth' });

    // Change CTA labels
    btnAchSubmit.textContent = 'Update Achievement';
    btnAchCancel.style.display = 'inline-block';
  }

  // Cancel edit achievement
  btnAchCancel.addEventListener('click', cancelAchievementEdit);

  function cancelAchievementEdit() {
    formAchievement.reset();
    inputAchId.value = '';
    achievementCoverBase64 = null;
    achPreviewBox.style.display = 'none';
    btnAchSubmit.textContent = 'Add Achievement';
    btnAchCancel.style.display = 'none';
  }

  // 3. Documents Form Submit
  formDocument.addEventListener('submit', async (e) => {
    e.preventDefault();

    const files = inputDocFile.files;
    if (files.length === 0) {
      showToast('Please select a file to upload.', 'error');
      return;
    }

    const file = files[0];
    const newDoc = {
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      date: new Date().toISOString().split('T')[0],
      fileBlob: file // Store the raw browser File object (which is a subclass of Blob)
    };

    try {
      await db.addDocument(newDoc);
      showToast('File uploaded successfully!');
      
      // Reset Upload UI
      formDocument.reset();
      docFileInfo.style.display = 'none';
      btnDocSubmit.style.display = 'none';
      
      await loadDocuments();
    } catch (err) {
      console.error(err);
      showToast('Failed to upload file.', 'error');
    }
  });


  /* ==========================================================================
     UTILITY METHODS (TOASTS, FORMATTING)
     ========================================================================== */

  // Toast System
  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
      `;
    } else {
      iconSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" x2="12" y1="8" y2="12"></line><line x1="12" x2="12" y1="16" y2="16"></line></svg>
      `;
    }

    toast.innerHTML = `
      ${iconSvg}
      <span>${message}</span>
    `;

    container.appendChild(toast);

    // Auto-remove toast after 3.5 seconds
    setTimeout(() => {
      toast.style.animation = 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse';
      toast.style.opacity = '0';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3500);
  }

  // Format File Size
  function formatBytes(bytes, decimals = 1) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /* ==========================================================================
     THREE.JS 3D BACKGROUND
     ========================================================================== */
  let threeScene, threeCamera, threeRenderer, particleSystem;

  function initThreeBackground() {
    const canvas = document.getElementById('canvas-3d');
    if (!canvas) return;

    // Create scene & camera
    threeScene = new THREE.Scene();
    threeCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
    threeCamera.position.z = 150;

    // Create renderer
    threeRenderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    threeRenderer.setSize(window.innerWidth, window.innerHeight);

    // Particle Cloud Geometry
    const particleCount = 600;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const initialPositions = []; // To animate floating offsets

    for (let i = 0; i < particleCount * 3; i += 3) {
      // Distribute in a spherical cloud
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 80 + Math.random() * 120; // Radius

      positions[i] = r * Math.sin(phi) * Math.cos(theta);     // x
      positions[i + 1] = r * Math.sin(phi) * Math.sin(theta); // y
      positions[i + 2] = r * Math.cos(phi);                  // z

      initialPositions.push({
        x: positions[i],
        y: positions[i + 1],
        z: positions[i + 2],
        speed: 0.05 + Math.random() * 0.15,
        offset: Math.random() * 100
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Custom circle texture (programmatic soft circle)
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = 16;
    textureCanvas.height = 16;
    const ctx = textureCanvas.getContext('2d');
    const gradient = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 16, 16);
    const texture = new THREE.CanvasTexture(textureCanvas);

    // Dynamic color based on current theme
    const isLight = document.body.getAttribute('data-theme') === 'light';
    const pMaterial = new THREE.PointsMaterial({
      size: 4,
      color: isLight ? 0x4f46e5 : 0x6366f1, // Indigo primary accent color
      transparent: true,
      opacity: 0.65,
      map: texture,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    particleSystem = new THREE.Points(geometry, pMaterial);
    threeScene.add(particleSystem);

    // Track mouse coordinates for interactive parallax
    let mouseX = 0, mouseY = 0;
    window.addEventListener('mousemove', (e) => {
      mouseX = (e.clientX - window.innerWidth / 2) * 0.15;
      mouseY = (e.clientY - window.innerHeight / 2) * 0.15;
    });

    // Handle Window Resize
    window.addEventListener('resize', () => {
      threeCamera.aspect = window.innerWidth / window.innerHeight;
      threeCamera.updateProjectionMatrix();
      threeRenderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Expose theme toggling update
    window.updateThreeTheme = (theme) => {
      pMaterial.color.setHex(theme === 'light' ? 0x4f46e5 : 0x6366f1);
    };

    // Animation Loop
    let clock = 0;
    function animate() {
      requestAnimationFrame(animate);

      clock += 0.005;

      // Slow drift rotation
      particleSystem.rotation.y = clock * 0.05;
      particleSystem.rotation.x = clock * 0.02;

      // Parallax smooth lookAt tracking mouse
      threeCamera.position.x += (mouseX - threeCamera.position.x) * 0.05;
      threeCamera.position.y += (-mouseY - threeCamera.position.y) * 0.05;
      threeCamera.lookAt(threeScene.position);

      threeRenderer.render(threeScene, threeCamera);
    }
    
    animate();
  }

  // Hook window.updateThreeTheme inside themeToggle event
  const currentSetTheme = setTheme;
  setTheme = (theme) => {
    currentSetTheme(theme);
    if (window.updateThreeTheme) {
      window.updateThreeTheme(theme);
    }
  };

  /* ==========================================================================
     GITHUB CONTRIBUTION GRAPH
     ========================================================================== */
  async function renderGithubGraph(username) {
    const profile = await db.getProfile();
    const activeUsername = username || profile?.githubUsername || 'alexmorgan';
    
    // Set public displays
    const displayEl = document.getElementById('github-username-display');
    if (displayEl) {
      displayEl.textContent = `@${activeUsername}`;
      if (displayEl.tagName === 'A') {
        displayEl.href = `https://github.com/${activeUsername}`;
      }
    }

    const gridContainer = document.getElementById('github-contribution-grid');
    if (!gridContainer) return;
    gridContainer.innerHTML = '';

    const monthsContainer = document.getElementById('github-months-row');
    if (monthsContainer) monthsContainer.innerHTML = '';

    // Calculate dates: start from Sunday of the week that is 52 weeks ago
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 Sunday, 6 Saturday
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 364 - dayOfWeek); // Go back exactly 52 weeks + offset to Sunday

    const contributionMap = new Map();
    let totalContributions = 0;
    let longestStreak = 0;
    let currentStreak = 0;
    let tempStreak = 0;

    // Fetch real data from api or generate mock
    let fetchedData = null;
    try {
      // Attempt fetching from deno API
      const response = await fetch(`https://github-contributions-api.deno.dev/${activeUsername}.json`);
      if (response.ok) {
        const json = await response.json();
        if (json && json.contributions) {
          fetchedData = json.contributions;
        }
      }
    } catch (err) {
      console.warn('Could not fetch GitHub contribution data, falling back to mock graph.', err);
    }

    // Build map for quick access
    if (fetchedData) {
      fetchedData.forEach(item => {
        contributionMap.set(item.date, { count: item.count, level: item.level });
      });
    }

    // Populate contributions array for 53 weeks (371 days)
    const totalDays = 371;
    const daysData = [];
    const dateCursor = new Date(startDate);

    // Mock randomizer parameters if API failed
    // Use hash or simple seeded random based on username so graph stays constant for same username
    let seed = 0;
    for (let charIndex = 0; charIndex < activeUsername.length; charIndex++) {
      seed += activeUsername.charCodeAt(charIndex);
    }
    function seededRandom() {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    }

    for (let i = 0; i < totalDays; i++) {
      const dateString = dateCursor.toISOString().split('T')[0];
      let dayData = contributionMap.get(dateString);

      if (!dayData) {
        // Generate mock data if missing
        const isWeekend = dateCursor.getDay() === 0 || dateCursor.getDay() === 6;
        const rand = seededRandom();
        
        let count = 0;
        let level = 0;

        // active developer simulation
        if (isWeekend) {
          if (rand > 0.8) { count = Math.floor(seededRandom() * 3) + 1; }
        } else {
          if (rand > 0.3) {
            count = Math.floor(seededRandom() * 8) + 1;
          }
        }

        // Determine Level (0 to 4)
        if (count === 0) level = 0;
        else if (count <= 2) level = 1;
        else if (count <= 4) level = 2;
        else if (count <= 6) level = 3;
        else level = 4;

        dayData = { count, level };
      }

      daysData.push({
        date: new Date(dateCursor),
        dateStr: dateString,
        count: dayData.count,
        level: dayData.level
      });

      totalContributions += dayData.count;

      // Calculate streaks
      if (dayData.count > 0) {
        tempStreak++;
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
      } else {
        tempStreak = 0;
      }

      // Increment cursor by 1 day
      dateCursor.setDate(dateCursor.getDate() + 1);
    }

    // Calculate current active streak (going backwards from today or yesterday)
    let streakCount = 0;
    const dayMs = 24 * 60 * 60 * 1000;
    const todayDateStr = today.toISOString().split('T')[0];
    const yesterdayDateStr = new Date(today.getTime() - dayMs).toISOString().split('T')[0];
    
    // Find index of today or yesterday in daysData
    let startIndex = daysData.findIndex(d => d.dateStr === todayDateStr);
    if (startIndex === -1 || daysData[startIndex].count === 0) {
      startIndex = daysData.findIndex(d => d.dateStr === yesterdayDateStr);
    }

    if (startIndex !== -1) {
      for (let j = startIndex; j >= 0; j--) {
        if (daysData[j].count > 0) {
          streakCount++;
        } else {
          break;
        }
      }
    }
    currentStreak = streakCount;

    // Update stats displays
    document.getElementById('github-total-contrib').textContent = totalContributions;
    document.getElementById('github-longest-streak').textContent = `${longestStreak} day${longestStreak !== 1 ? 's' : ''}`;
    document.getElementById('github-current-streak').textContent = `${currentStreak} day${currentStreak !== 1 ? 's' : ''}`;

    // Render Months Row Labels
    let lastMonth = -1;
    const monthSpans = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let col = 0; col < 53; col++) {
      // Look at the first day of each week column (row 0)
      const dayIndex = col * 7;
      if (dayIndex < daysData.length) {
        const d = daysData[dayIndex].date;
        const m = d.getMonth();
        if (m !== lastMonth) {
          monthSpans.push({ label: months[m], colIndex: col });
          lastMonth = m;
        }
      }
    }

    // Append month labels (with relative spacing calculated)
    let currentColumn = 0;
    monthSpans.forEach((mSpan) => {
      const span = document.createElement('span');
      span.textContent = mSpan.label;
      const diff = mSpan.colIndex - currentColumn;
      if (diff > 0 && monthsContainer.children.length > 0) {
        monthsContainer.appendChild(document.createElement('span')); // empty spacer
      }
      monthsContainer.appendChild(span);
      currentColumn = mSpan.colIndex;
    });

    // Create Tooltip DOM if it doesn't exist
    let tooltip = document.getElementById('github-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'github-tooltip';
      tooltip.className = 'github-tooltip';
      tooltip.style.display = 'none';
      document.body.appendChild(tooltip);
    }

    // Render Grid Squares
    daysData.forEach((day) => {
      const square = document.createElement('div');
      square.className = `contrib-day level-${day.level}`;
      square.setAttribute('data-date', day.dateStr);
      square.setAttribute('data-count', day.count);

      // Tooltip Event Handlers
      square.addEventListener('mouseenter', (e) => {
        const formattedDate = day.date.toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric'
        });
        tooltip.innerHTML = `<strong>${day.count === 0 ? 'No' : day.count} contribution${day.count !== 1 ? 's' : ''}</strong><br>${formattedDate}`;
        tooltip.style.display = 'block';

        // Position tooltip
        const rect = square.getBoundingClientRect();
        tooltip.style.left = `${rect.left + window.scrollX - tooltip.offsetWidth / 2 + 5}px`;
        tooltip.style.top = `${rect.top + window.scrollY - tooltip.offsetHeight - 8}px`;
      });

      square.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
      });

      gridContainer.appendChild(square);
    });
  }

  // Hook up GitHub edit account triggers
  function initGithubAccountLinking() {
    const editBtn = document.getElementById('edit-github-username-btn');
    const modal = document.getElementById('github-modal');
    const closeBtn = document.getElementById('github-modal-close');
    const cancelBtn = document.getElementById('github-modal-cancel');
    const saveBtn = document.getElementById('github-modal-save');
    const input = document.getElementById('modal-github-username');

    if (!editBtn || !modal) return;

    editBtn.addEventListener('click', async () => {
      const profile = await db.getProfile();
      input.value = profile?.githubUsername || '';
      modal.classList.add('active');
    });

    const hideModal = () => {
      modal.classList.remove('active');
    };

    closeBtn.addEventListener('click', hideModal);
    cancelBtn.addEventListener('click', hideModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) hideModal();
    });

    saveBtn.addEventListener('click', async () => {
      const usernameVal = input.value.trim();
      if (!usernameVal) {
        showToast('Please enter a username.', 'error');
        return;
      }

      try {
        const profile = await db.getProfile();
        profile.githubUsername = usernameVal;
        
        // Also update form inputs in dashboard
        if (inputGithubUsername) {
          inputGithubUsername.value = usernameVal;
        }

        await db.saveProfile(profile);
        showToast('GitHub username linked successfully!');
        hideModal();
        await renderGithubGraph(usernameVal);
      } catch (err) {
        console.error(err);
        showToast('Failed to save GitHub username.', 'error');
      }
    });
  }

  // Expose renderGithubGraph globally for dynamic updates
  window.renderGithubGraph = renderGithubGraph;

  /* ==========================================================================
     AI PORTFOLIO CHATBOT
     ========================================================================== */
  function initAIChatbot() {
    const trigger = document.getElementById('chatbot-trigger');
    const windowEl = document.getElementById('chatbot-window');
    const closeBtn = document.getElementById('chatbot-close');
    const form = document.getElementById('chatbot-form');
    const input = document.getElementById('chatbot-input');
    const messagesBox = document.getElementById('chatbot-messages');
    const suggestionsBox = document.getElementById('chatbot-suggestions');

    if (!trigger || !windowEl) return;

    // Toggle chatbot window open/close
    trigger.addEventListener('click', () => {
      const isActive = windowEl.classList.contains('active');
      if (isActive) {
        windowEl.classList.remove('active');
        trigger.querySelector('.chat-open-icon').style.display = 'block';
        trigger.querySelector('.chat-close-icon').style.display = 'none';
      } else {
        windowEl.classList.add('active');
        trigger.querySelector('.chat-open-icon').style.display = 'none';
        trigger.querySelector('.chat-close-icon').style.display = 'block';
        
        // Remove notification dot on first open
        const notifDot = trigger.querySelector('.chatbot-notification-dot');
        if (notifDot) notifDot.style.display = 'none';

        // Lazy load greeting
        if (messagesBox.children.length === 0) {
          showBotGreeting();
        }
      }
    });

    closeBtn.addEventListener('click', () => {
      windowEl.classList.remove('active');
      trigger.querySelector('.chat-open-icon').style.display = 'block';
      trigger.querySelector('.chat-close-icon').style.display = 'none';
    });

    // Handle initial greeting message
    async function showBotGreeting() {
      const profile = await db.getProfile();
      const greeting = profile?.chatbotGreeting || "Hello! I am your portfolio virtual assistant. Feel free to ask me about my background, technical skills, or accomplishments.";
      
      appendMessage('bot', greeting);
      renderSuggestions();
    }

    // Append standard suggestions chips
    function renderSuggestions() {
      if (!suggestionsBox) return;
      suggestionsBox.innerHTML = '';

      const options = [
        "What are your skills?",
        "Key achievements",
        "Download resume/docs",
        "How to contact you?"
      ];

      options.forEach(opt => {
        const chip = document.createElement('button');
        chip.className = 'suggestion-chip';
        chip.textContent = opt;
        chip.addEventListener('click', () => {
          handleUserQuery(opt);
        });
        suggestionsBox.appendChild(chip);
      });
    }

    // Append bot / user chat bubble
    function appendMessage(sender, text) {
      const bubble = document.createElement('div');
      bubble.className = `chat-bubble ${sender}`;
      bubble.innerHTML = text; // Safe here since we build secure HTML string
      messagesBox.appendChild(bubble);
      messagesBox.scrollTop = messagesBox.scrollHeight;
      return bubble;
    }

    // Append typing indicator bubble
    function appendTypingIndicator() {
      const bubble = document.createElement('div');
      bubble.className = 'chat-bubble bot typing-bubble';
      bubble.innerHTML = `
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      `;
      messagesBox.appendChild(bubble);
      messagesBox.scrollTop = messagesBox.scrollHeight;
      return bubble;
    }

    // User Message Form Submission
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      
      input.value = '';
      handleUserQuery(text);
    });

    // Query processing engine
    async function handleUserQuery(query) {
      appendMessage('user', query);

      // Show typing indicator
      const typingBubble = appendTypingIndicator();

      // Retrieve profile database contexts
      const profile = await db.getProfile();
      const achievements = await db.getAchievements();
      const documents = await db.getDocuments();

      // Formulate response after short human-like typing delay
      setTimeout(() => {
        typingBubble.remove();
        
        const normQuery = query.toLowerCase();
        let reply = "";

        // Keyword matches
        if (normQuery.includes('hello') || normQuery.includes('hi') || normQuery.includes('hey')) {
          reply = `Hello! 👋 I'm the AI assistant for **${profile?.name || 'Alex Morgan'}**. I can help guide you through their portfolio. Ask me about their technical skills, achievements, or documents!`;
        } 
        else if (normQuery.includes('skill') || normQuery.includes('technolog') || normQuery.includes('expert') || normQuery.includes('expertis') || normQuery.includes('language') || normQuery.includes('stack')) {
          if (profile?.skills && profile.skills.length > 0) {
            const skillList = profile.skills.map(s => `<li>${s.trim()}</li>`).join('');
            reply = `Here is a summary of my technical skills and areas of expertise:<br><ul style="padding-left: 18px; margin-top: 8px;">${skillList}</ul>`;
          } else {
            reply = "I haven't uploaded my technical skills to the database yet. Check back soon!";
          }
        } 
        else if (normQuery.includes('achievement') || normQuery.includes('award') || normQuery.includes('milestone') || normQuery.includes('project') || normQuery.includes('accomplish')) {
          if (achievements && achievements.length > 0) {
            const achList = achievements.map(ach => `<li><strong>${ach.title}</strong> (${ach.date})<br>${ach.description}</li>`).join('<br>');
            reply = `Here are some of my key professional achievements:<br><ul style="padding-left: 18px; margin-top: 8px; display: flex; flex-direction: column; gap: 8px;">${achList}</ul>`;
          } else {
            reply = "I haven't added my key achievements yet. Feel free to explore other details!";
          }
        } 
        else if (normQuery.includes('resume') || normQuery.includes('cv') || normQuery.includes('document') || normQuery.includes('file') || normQuery.includes('download') || normQuery.includes('asset')) {
          if (documents && documents.length > 0) {
            const docList = documents.map(doc => {
              const downloadUrl = URL.createObjectURL(doc.fileBlob);
              activeObjectUrls.push(downloadUrl);
              return `<li>📄 <a href="${downloadUrl}" download="${doc.name}" style="color:var(--accent-tertiary); font-weight:600; text-decoration:underline;">${doc.name}</a> (${formatBytes(doc.size)})</li>`;
            }).join('');
            reply = `You can download my professional documents directly from this chat window:<br><ul style="padding-left: 18px; margin-top: 8px; display: flex; flex-direction: column; gap: 6px;">${docList}</ul>`;
          } else {
            reply = "No downloadable documents are currently available. Check out the public Documents section for static resumes!";
          }
        } 
        else if (normQuery.includes('contact') || normQuery.includes('social') || normQuery.includes('email') || normQuery.includes('github') || normQuery.includes('linkedin') || normQuery.includes('twitter') || normQuery.includes('hire')) {
          const socials = profile?.socials || {};
          let socialLinks = [];
          if (socials.github) socialLinks.push(`<li><a href="${socials.github}" target="_blank">GitHub Profile</a></li>`);
          if (socials.linkedin) socialLinks.push(`<li><a href="${socials.linkedin}" target="_blank">LinkedIn Profile</a></li>`);
          if (socials.twitter) socialLinks.push(`<li><a href="${socials.twitter}" target="_blank">Twitter / X</a></li>`);
          
          if (socialLinks.length > 0) {
            reply = `You can get in touch or follow my work at these profiles:<br><ul style="padding-left: 18px; margin-top: 8px;">${socialLinks.join('')}</ul>`;
          } else {
            reply = `Feel free to link social accounts in the Admin settings panel!`;
          }
        } 
        else if (normQuery.includes('who are you') || normQuery.includes('about') || normQuery.includes('bio') || normQuery.includes('background') || normQuery.includes('profile')) {
          reply = `<strong>About me:</strong><br>${profile?.bio || 'Creative Technologist specialized in client-side system architecture.'}`;
        }
        else {
          reply = `I'm not sure I understand that query. 😅 Here are some things you can ask me:
            <ul style="padding-left: 18px; margin-top: 6px;">
              <li>What are my <strong>skills</strong>?</li>
              <li>Tell me about your <strong>achievements</strong>.</li>
              <li>Can I download your <strong>resume</strong>?</li>
              <li>How can I <strong>contact</strong> you?</li>
            </ul>`;
        }

        appendMessage('bot', reply);
      }, 700 + Math.random() * 800);
    }
  }
});
