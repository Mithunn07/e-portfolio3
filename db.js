/**
 * db.js - IndexedDB storage wrapper for E-Portfolio
 * Handles persistent local storage of profile details, achievements, and documents.
 */

const DB_NAME = 'EPortfolioDB';
const DB_VERSION = 1;

// Default SVGs as Data URIs for rich premium placeholders
const DEFAULT_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%238a2be2" /><stop offset="100%" stop-color="%234a00e0" /></linearGradient><clipPath id="cp"><circle cx="100" cy="100" r="90" /></clipPath></defs><rect width="200" height="200" fill="url(%23g1)"/><circle cx="100" cy="80" r="35" fill="%23ffffff" fill-opacity="0.95"/><path d="M 40 160 C 40 120, 160 120, 160 160 Z" fill="%23ffffff" fill-opacity="0.95" clip-path="url(%23cp)"/></svg>`;

const DEFAULT_ACH_1 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23f72585" /><stop offset="100%" stop-color="%237209b7" /></linearGradient></defs><rect width="600" height="400" fill="url(%23g)"/><circle cx="450" cy="100" r="150" fill="%23ffffff" fill-opacity="0.05"/><text x="50" y="220" font-family="'Outfit', 'Inter', sans-serif" font-size="48" font-weight="800" fill="%23ffffff">AWARD 2025</text><text x="50" y="270" font-family="'Inter', sans-serif" font-size="20" fill="%23ffffff" fill-opacity="0.8">Excellence in Frontend Design</text><rect x="50" y="130" width="80" height="8" rx="4" fill="%234cc9f0"/></svg>`;

const DEFAULT_ACH_2 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%234361ee" /><stop offset="100%" stop-color="%234cc9f0" /></linearGradient></defs><rect width="600" height="400" fill="url(%23g)"/><polygon points="50,300 250,50 450,300" fill="%23ffffff" fill-opacity="0.05"/><text x="50" y="220" font-family="'Outfit', 'Inter', sans-serif" font-size="48" font-weight="800" fill="%23ffffff">LEAD DEV</text><text x="50" y="270" font-family="'Inter', sans-serif" font-size="20" fill="%23ffffff" fill-opacity="0.8">Nexus Core Infrastructure</text><rect x="50" y="130" width="80" height="8" rx="4" fill="%23f72585"/></svg>`;

const DEFAULT_ACH_3 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%233f37c9" /><stop offset="100%" stop-color="%23f72585" /></linearGradient></defs><rect width="600" height="400" fill="url(%23g)"/><rect x="350" y="50" width="200" height="200" rx="30" transform="rotate(45 450 150)" fill="%23ffffff" fill-opacity="0.05"/><text x="50" y="220" font-family="'Outfit', 'Inter', sans-serif" font-size="48" font-weight="800" fill="%23ffffff">OPEN SOURCE</text><text x="50" y="270" font-family="'Inter', sans-serif" font-size="20" fill="%23ffffff" fill-opacity="0.8">5,000+ Stars Toolkit</text><rect x="50" y="130" width="80" height="8" rx="4" fill="%234cc9f0"/></svg>`;

const REPO_OWNER = 'mithunn07';
const REPO_NAME = 'e-portfolio';
const DATA_FILE_PATH = 'data.json';

class EPortfolioDB {
  constructor() {
    this.data = {
      profile: null,
      achievements: [],
      documents: [],
      roadmap: []
    };
    this.fileSha = null;
  }

  async init() {
    try {
      // First try to load from localStorage
      const localData = localStorage.getItem('eportfolio_data');
      if (localData) {
        try {
          this.data = JSON.parse(localData);
          console.log("Loaded data from localStorage.");
        } catch (e) {
          console.error("Failed to parse local data", e);
          await this.seedDefaultData();
        }
      } else {
        // If no local data, seed defaults
        console.log("No existing data found, initializing default DB.");
        await this.seedDefaultData();
        this.saveLocally();
      }
    } catch (e) {
      console.error("localStorage access failed (possibly due to browser restrictions). Running in-memory only.", e);
      await this.seedDefaultData();
    }

    // Attempt to sync with GitHub in the background
    this.fetchShaFromGithub().then(() => {
      this.saveLocally(); // Sync local cache with GitHub
    }).catch(e => console.warn("GitHub sync skipped:", e.message));

    return this;
  }

  saveLocally() {
    try {
      localStorage.setItem('eportfolio_data', JSON.stringify(this.data));
    } catch (e) {
      console.warn("Failed to save to localStorage. Data might be too large.", e);
    }
  }

  async fetchShaFromGithub() {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${DATA_FILE_PATH}`;
    const response = await fetch(url);
    if (response.ok) {
      const fileInfo = await response.json();
      this.fileSha = fileInfo.sha;
      
      // Parse content from GitHub to ensure we have the absolute latest data
      const content = atob(fileInfo.content);
      this.data = JSON.parse(decodeURIComponent(escape(content)));
    } else {
      throw new Error("File not found on GitHub");
    }
  }

  // --- SAVE MECHANISM ---
  async commitToGithub() {
    const token = sessionStorage.getItem('github_token');
    if (!token) {
      console.warn("No GitHub Token provided. Changes saved locally only.");
      return; // Skip GitHub commit if not logged in
    }

    const contentStr = JSON.stringify(this.data, null, 2);
    // Base64 encode for GitHub API (handles unicode safely)
    const contentEncoded = btoa(unescape(encodeURIComponent(contentStr)));

    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${DATA_FILE_PATH}`;
    
    const body = {
      message: "Update portfolio data via Admin Panel",
      content: contentEncoded,
      branch: "main" // Change this if the default branch is different
    };

    if (this.fileSha) {
      body.sha = this.fileSha;
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.message || "Failed to commit to GitHub");
    }

    const result = await response.json();
    this.fileSha = result.content.sha;
  }

  async seedDefaultData() {
    this.data.profile = {
      id: 'main',
      name: 'Alex Morgan',
      title: 'Creative Technologist & UI Engineer',
      bio: 'I design and build immersive digital experiences that live at the intersection of aesthetic art and high-fidelity code. Specialized in modern interactive UI, CSS micro-animations, and client-side system architecture.',
      skills: ['JavaScript (ES6+)', 'HTML5 / CSS3', 'UI/UX Design', 'WebGL & Three.js', 'Performance Optimization', 'Responsive Architecture'],
      avatar: DEFAULT_AVATAR,
      githubUsername: 'alexmorgan',
      chatbotGreeting: "Hi there! I am Alex Morgan's AI assistant. Ask me anything about my expertise, key achievements, or professional documents!",
      socials: {
        github: 'https://github.com',
        linkedin: 'https://linkedin.com',
        twitter: 'https://twitter.com'
      }
    };

    this.data.achievements = [
      {
        id: 1,
        title: 'Best Creative Frontend Design 2025',
        description: 'Awarded first place at the global Creative Web Awards for creating a fully immersive, 3D interactive web experiences with 60FPS animations and accessibility compliant design.',
        date: '2025-11-15',
        image: DEFAULT_ACH_1
      },
      {
        id: 2,
        title: 'Lead Architect at Nexus Framework',
        description: 'Spearheaded the UI core rewrite of the Nexus open-source dashboard template, reducing load times by 42% and implementing modular web-components used by 15k+ developers.',
        date: '2024-03-01',
        image: DEFAULT_ACH_2
      },
      {
        id: 3,
        title: 'Released Glassmorphic CSS Engine',
        description: 'Developed and open-sourced a lightweight CSS module for advanced glassmorphism rendering on low-spec mobile browsers. Surpassed 5k GitHub stars in 6 weeks.',
        date: '2023-08-10',
        image: DEFAULT_ACH_3
      }
    ];

    this.data.roadmap = [
      {
        id: 1,
        year: '2026',
        month: 'February',
        title: 'Senior Frontend Certification',
        description: 'Mastered advanced web architecture and performance optimization techniques.'
      },
      {
        id: 2,
        year: '2025',
        month: 'August',
        title: 'Full-Stack Integration Mastery',
        description: 'Completed comprehensive training in connecting modern UIs with scalable backend systems.'
      }
    ];

    const resumeContent = `ALEX MORGAN - PORTFOLIO RESUME\n\nContact: alex.morgan@example.com\n\nExperience:\n- Creative Developer at Nexus (2023 - Present)\n- UI Engineer at PixelWorks (2020 - 2023)\n\nSkills:\n- Pure JavaScript, Modern CSS, IndexedDB, Canvas API`;
    const resumeBlob = new Blob([resumeContent], { type: 'text/plain' });
    const resumeBase64 = await this.blobToBase64(resumeBlob);

    this.data.documents = [
      {
        id: 1,
        name: 'Alex_Morgan_Resume.txt',
        type: 'text/plain',
        size: resumeBlob.size,
        date: new Date().toISOString().split('T')[0],
        fileBase64: resumeBase64
      }
    ];
  }

  // --- PROFILE METHODS ---
  async getProfile() {
    return this.data.profile;
  }

  async saveProfile(profileData) {
    this.data.profile = { ...profileData, id: 'main' };
    this.saveLocally();
    try {
      await this.commitToGithub();
    } catch (e) {
      console.warn("GitHub commit failed. Saved locally.", e);
    }
    return this.data.profile;
  }

  // --- ACHIEVEMENTS METHODS ---
  async getAchievements() {
    return this.data.achievements;
  }

  async addAchievement(ach) {
    ach.id = Date.now(); // Unique ID
    this.data.achievements.push(ach);
    this.saveLocally();
    try { await this.commitToGithub(); } catch(e) {}
    return ach;
  }

  async updateAchievement(ach) {
    const index = this.data.achievements.findIndex(a => a.id == ach.id);
    if (index !== -1) {
      this.data.achievements[index] = ach;
      this.saveLocally();
      try { await this.commitToGithub(); } catch(e) {}
    }
    return ach;
  }

  async deleteAchievement(id) {
    this.data.achievements = this.data.achievements.filter(a => a.id != id);
    this.saveLocally();
    try { await this.commitToGithub(); } catch(e) {}
  }

  // --- DOCUMENTS METHODS ---
  async getDocuments() {
    return this.data.documents.map(doc => {
      if (doc.fileBase64 && !doc.fileBlob) {
        doc.fileBlob = this.dataURItoBlob(doc.fileBase64);
      }
      return doc;
    });
  }

  async addDocument(doc) {
    doc.id = Date.now();
    if (doc.fileBlob) {
      doc.fileBase64 = await this.blobToBase64(doc.fileBlob);
      // Remove fileBlob before stringifying to save memory and avoid JSON errors
      delete doc.fileBlob; 
    }
    this.data.documents.push(doc);
    this.saveLocally();
    try { await this.commitToGithub(); } catch(e) {}
    return doc;
  }

  async deleteDocument(id) {
    this.data.documents = this.data.documents.filter(d => d.id != id);
    this.saveLocally();
    try { await this.commitToGithub(); } catch(e) {}
  }

  // --- ROADMAP METHODS ---
  async getRoadmap() {
    return this.data.roadmap || [];
  }

  async addRoadmapItem(item) {
    item.id = Date.now();
    if (!this.data.roadmap) this.data.roadmap = [];
    this.data.roadmap.push(item);
    // Sort chronologically (newest first)
    this.data.roadmap.sort((a, b) => b.year - a.year);
    this.saveLocally();
    try { await this.commitToGithub(); } catch(e) {}
    return item;
  }

  async updateRoadmapItem(item) {
    if (!this.data.roadmap) this.data.roadmap = [];
    const index = this.data.roadmap.findIndex(r => r.id == item.id);
    if (index !== -1) {
      this.data.roadmap[index] = item;
      this.data.roadmap.sort((a, b) => b.year - a.year);
      this.saveLocally();
      try { await this.commitToGithub(); } catch(e) {}
    }
    return item;
  }

  async deleteRoadmapItem(id) {
    if (!this.data.roadmap) this.data.roadmap = [];
    this.data.roadmap = this.data.roadmap.filter(r => r.id != id);
    this.saveLocally();
    try { await this.commitToGithub(); } catch(e) {}
  }

  // --- UTILS ---
  blobToBase64(blob) {
    return new Promise((resolve, _) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  }

  dataURItoBlob(dataURI) {
    const parts = dataURI.split(',');
    const byteString = atob(parts[1]);
    const mimeString = parts[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  }
}

// Expose EPortfolioDB class globally
window.EPortfolioDB = EPortfolioDB;
