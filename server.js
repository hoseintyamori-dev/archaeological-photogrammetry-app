const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const projectDir = path.join(uploadsDir, req.body.projectId);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }
    cb(null, projectDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// In-memory project storage (in production, use a database)
const projects = new Map();

// Routes

// 1. Create a new project
app.post('/api/projects', (req, res) => {
  try {
    const { name } = req.body;
    const projectId = uuidv4();
    
    const project = {
      id: projectId,
      name: name,
      createdAt: new Date(),
      images: [],
      processingStatus: 'idle'
    };
    
    projects.set(projectId, project);
    
    res.json({
      success: true,
      project: project
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 2. Get all projects
app.get('/api/projects', (req, res) => {
  try {
    const allProjects = Array.from(projects.values());
    res.json({
      success: true,
      projects: allProjects
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 3. Get a specific project
app.get('/api/projects/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    const project = projects.get(projectId);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }
    
    res.json({
      success: true,
      project: project
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 4. Upload images to a project
app.post('/api/projects/:projectId/upload', upload.array('images', 100), (req, res) => {
  try {
    const { projectId } = req.params;
    const project = projects.get(projectId);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }
    
    const uploadedImages = req.files.map(file => ({
      id: uuidv4(),
      originalName: file.originalname,
      filename: file.filename,
      path: `/uploads/${projectId}/${file.filename}`,
      size: file.size,
      mimetype: file.mimetype,
      uploadedAt: new Date()
    }));
    
    project.images.push(...uploadedImages);
    
    res.json({
      success: true,
      message: `${uploadedImages.length} image(s) uploaded successfully`,
      images: uploadedImages,
      totalImages: project.images.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 5. Get images of a project
app.get('/api/projects/:projectId/images', (req, res) => {
  try {
    const { projectId } = req.params;
    const project = projects.get(projectId);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }
    
    res.json({
      success: true,
      images: project.images
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 6. Delete an image from a project
app.delete('/api/projects/:projectId/images/:imageId', (req, res) => {
  try {
    const { projectId, imageId } = req.params;
    const project = projects.get(projectId);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }
    
    const imageIndex = project.images.findIndex(img => img.id === imageId);
    
    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Image not found'
      });
    }
    
    const deletedImage = project.images[imageIndex];
    
    // Delete file from disk
    const filePath = path.join(__dirname, 'uploads', projectId, deletedImage.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    project.images.splice(imageIndex, 1);
    
    res.json({
      success: true,
      message: 'Image deleted successfully',
      remainingImages: project.images.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 7. Delete a project
app.delete('/api/projects/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    
    if (!projects.has(projectId)) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }
    
    // Delete project directory
    const projectDir = path.join(__dirname, 'uploads', projectId);
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true });
    }
    
    projects.delete(projectId);
    
    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 8. Start processing images (simulation)
app.post('/api/projects/:projectId/process', (req, res) => {
  try {
    const { projectId } = req.params;
    const project = projects.get(projectId);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }
    
    if (project.images.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No images to process'
      });
    }
    
    project.processingStatus = 'processing';
    
    // Simulate processing
    setTimeout(() => {
      project.processingStatus = 'completed';
    }, 5000);
    
    res.json({
      success: true,
      message: 'Processing started',
      projectId: projectId,
      imageCount: project.images.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 9. Get processing status
app.get('/api/projects/:projectId/status', (req, res) => {
  try {
    const { projectId } = req.params;
    const project = projects.get(projectId);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }
    
    res.json({
      success: true,
      status: project.processingStatus,
      imageCount: project.images.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Archaeological Photogrammetry Server running on http://localhost:${PORT}`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
});
