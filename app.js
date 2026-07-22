// Project Management
class ProjectManager {
  constructor() {
    this.projects = this.loadProjects();
  }

  loadProjects() {
    const saved = localStorage.getItem('archaeoProjects');
    return saved ? JSON.parse(saved) : [];
  }

  saveProjects() {
    localStorage.setItem('archaeoProjects', JSON.stringify(this.projects));
  }

  createProject(name) {
    const project = {
      id: Date.now(),
      name: name,
      createdAt: new Date(),
      images: [],
      processing: false
    };
    this.projects.push(project);
    this.saveProjects();
    return project;
  }

  getProject(id) {
    return this.projects.find(p => p.id === id);
  }

  deleteProject(id) {
    this.projects = this.projects.filter(p => p.id !== id);
    this.saveProjects();
  }
}

// Image Upload Handler
class ImageUploadHandler {
  constructor(uploadArea, fileInput, previewContainer) {
    this.uploadArea = uploadArea;
    this.fileInput = fileInput;
    this.previewContainer = previewContainer;
    this.images = [];
    this.init();
  }

  init() {
    this.uploadArea.addEventListener('click', () => this.fileInput.click());
    this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
    this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
    this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
  }

  handleDragOver(e) {
    e.preventDefault();
    this.uploadArea.classList.add('drag-over');
  }

  handleDragLeave(e) {
    e.preventDefault();
    this.uploadArea.classList.remove('drag-over');
  }

  handleDrop(e) {
    e.preventDefault();
    this.uploadArea.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files);
    this.processFiles(files);
  }

  handleFileSelect(e) {
    const files = Array.from(e.target.files);
    this.processFiles(files);
  }

  processFiles(files) {
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.images.push({
            name: file.name,
            data: e.target.result,
            size: file.size
          });
          this.renderPreview();
          document.getElementById('processBtn').disabled = false;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  renderPreview() {
    this.previewContainer.innerHTML = '';
    this.images.forEach((img, idx) => {
      const div = document.createElement('div');
      div.className = 'preview-item';
      div.innerHTML = `
        <img src="${img.data}" alt="Preview">
        <p>${img.name}</p>
        <button onclick="uploadHandler.removeImage(${idx})">Remove</button>
      `;
      this.previewContainer.appendChild(div);
    });
  }

  removeImage(idx) {
    this.images.splice(idx, 1);
    this.renderPreview();
    if (this.images.length === 0) {
      document.getElementById('processBtn').disabled = true;
    }
  }

  getImages() {
    return this.images;
  }

  clear() {
    this.images = [];
    this.renderPreview();
  }
}

// View Navigation
class ViewNavigator {
  constructor() {
    this.currentView = 'dashboard';
    this.init();
  }

  init() {
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchView(e.target.dataset.view);
      });
    });
  }

  switchView(viewName) {
    // Hide all views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    
    // Show selected view
    const view = document.getElementById(viewName);
    if (view) {
      view.classList.add('active');
      this.currentView = viewName;
    }

    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });
  }
}

// Initialize
let projectManager;
let uploadHandler;
let viewNavigator;

document.addEventListener('DOMContentLoaded', () => {
  projectManager = new ProjectManager();
  uploadHandler = new ImageUploadHandler(
    document.getElementById('uploadArea'),
    document.getElementById('fileInput'),
    document.getElementById('imagePreview')
  );
  viewNavigator = new ViewNavigator();

  // Button handlers
  document.getElementById('startButton').addEventListener('click', () => {
    viewNavigator.switchView('upload');
  });

  document.getElementById('newProjectBtn').addEventListener('click', () => {
    const projectName = prompt('Enter project name:');
    if (projectName) {
      projectManager.createProject(projectName);
      renderProjects();
    }
  });

  document.getElementById('processBtn').addEventListener('click', () => {
    const images = uploadHandler.getImages();
    if (images.length > 0) {
      viewNavigator.switchView('processing');
      simulateProcessing(images);
    }
  });

  renderProjects();
});

function renderProjects() {
  const list = document.getElementById('projectsList');
  list.innerHTML = '';
  projectManager.projects.forEach(project => {
    const div = document.createElement('div');
    div.className = 'project-card';
    div.innerHTML = `
      <h3>${project.name}</h3>
      <p>${project.images.length} images</p>
      <small>${new Date(project.createdAt).toLocaleDateString()}</small>
      <button onclick="projectManager.deleteProject(${project.id}); renderProjects();">Delete</button>
    `;
    list.appendChild(div);
  });
}

function simulateProcessing(images) {
  const status = document.getElementById('processingStatus');
  status.innerHTML = `<p>Processing ${images.length} images...</p>`;
  
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 15;
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
      status.innerHTML = `<p>✅ Processing complete! (${images.length} images)</p>`;
      uploadHandler.clear();
    }
    status.innerHTML = `
      <p>Processing progress: ${Math.floor(progress)}%</p>
      <div class="progress-bar"><div class="progress-fill" style="width: ${progress}%"></div></div>
    `;
  }, 500);
}