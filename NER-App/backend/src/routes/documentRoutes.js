const router = require('express').Router();
const multer = require('multer');

const {
  documentController,
  entityController,
  lineController,
  exportController,
} = require('../controllers');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

// Document lifecycle routes
router.post('/', upload.single('file'), documentController.upload);
router.get('/', documentController.list);
router.get('/:id', documentController.get);
router.delete('/:id', documentController.remove);

// Entity review & segment-level annotation routes
router.patch('/:id/segments/:segmentIndex/entities/:entityId', entityController.reviewEntity);
router.post('/:id/segments/:segmentIndex/entities', entityController.addEntity);
router.put('/:id/segments/:segmentIndex/entities', entityController.saveSegmentEntities);
router.post('/:id/segments/:segmentIndex/reset', entityController.resetSegment);

// Sentence line-level annotation routes
router.put('/:id/segments/:segmentIndex/line-entities', lineController.saveLineEntities);
router.post('/:id/segments/:segmentIndex/reset-line', lineController.resetLine);

// Export & training dataset routes
router.get('/training-data', exportController.trainingData);
router.get('/:id/training-data', exportController.trainingData);
router.get('/:id/label-studio', exportController.labelStudioExport);

module.exports = router;
