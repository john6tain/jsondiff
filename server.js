const express = require('express');
const { diff } = require('deep-diff');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/diff', (req, res) => {
  const { json1, json2 } = req.body;

  if (json1 === undefined || json2 === undefined) {
    return res.status(400).json({ diffs: null, error: 'Both json1 and json2 are required' });
  }

  let obj1, obj2;
  try {
    obj1 = typeof json1 === 'string' ? JSON.parse(json1) : json1;
  } catch (e) {
    return res.status(400).json({ diffs: null, error: `Invalid JSON (left): ${e.message}` });
  }
  try {
    obj2 = typeof json2 === 'string' ? JSON.parse(json2) : json2;
  } catch (e) {
    return res.status(400).json({ diffs: null, error: `Invalid JSON (right): ${e.message}` });
  }

  const diffs = diff(obj1, obj2) || [];
  res.json({ diffs, error: null });
});

app.listen(PORT, () => {
  console.log(`JSON Diff running at http://localhost:${PORT}`);
});
