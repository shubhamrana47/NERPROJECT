const router = require('express').Router();
const multer = require('multer');

const {
  documentController,
  entityController,
  lineController,
  predictController,
  exportController,
} = require('../controllers');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

// Document lifecycle routes
router.post('/', upload.single('file'), documentController.upload);
router.get('/', documentController.list);

// Corpus-wide export routes. These must be declared before '/:id', which would
// otherwise match 'dataset' and 'training-data' as document ids.
router.get('/dataset', exportController.datasetExport);
router.get('/training-data', exportController.trainingData);

router.get('/:id', documentController.get);
router.delete('/:id', documentController.remove);

// Entity review & segment-level annotation routes
router.patch('/:id/segments/:segmentIndex/entities/:entityId', entityController.reviewEntity);
router.post('/:id/segments/:segmentIndex/entities', entityController.addEntity);
router.put('/:id/segments/:segmentIndex/entities', entityController.saveSegmentEntities);
router.post('/:id/segments/:segmentIndex/reset', entityController.resetSegment);

// On-demand inference for a window of passages
router.post('/:id/predict', predictController.predictSegments);
router.post('/:id/skip-inference', documentController.skipInference);

// Validation workflow: acknowledge a passage that holds no entities
router.post(
  '/:id/segments/:segmentIndex/nothing-to-validate',
  lineController.acknowledgeEmptyPassage
);

// Sentence line-level annotation routes
router.put('/:id/segments/:segmentIndex/line-entities', lineController.saveLineEntities);
router.post('/:id/segments/:segmentIndex/reset-line', lineController.resetLine);

// Per-document export routes
router.get('/:id/dataset', exportController.datasetExport);
router.get('/:id/training-data', exportController.trainingData);
router.get('/:id/label-studio', exportController.labelStudioExport);

module.exports = router;
