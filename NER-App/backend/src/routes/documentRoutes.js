const router = require('express').Router();
const multer = require('multer');
const c = require('../controllers/documentController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

router.post('/', upload.single('file'), c.upload);
router.get('/', c.list);
router.get('/training-data', c.trainingData);
router.get('/:id', c.get);
router.get('/:id/training-data', c.trainingData);
router.delete('/:id', c.remove);
router.patch('/:id/segments/:segmentIndex/entities/:entityId', c.reviewEntity);

module.exports = router;
