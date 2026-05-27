import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'database');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const getFile = (name) => path.join(DB_PATH, `${name}.json`);

app.get('/api/:collection', async (req, res) => {
    try {
        const data = await fs.readFile(getFile(req.params.collection), 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/:collection', async (req, res) => {
    try {
        const collection = req.params.collection;
        const filePath = getFile(collection);

        if (collection === 'usage_logs' && !Array.isArray(req.body)) {
            // Append mode for usage logs
            let current = [];
            try {
                const data = await fs.readFile(filePath, 'utf8');
                current = JSON.parse(data);
                if (!Array.isArray(current)) current = [];
            } catch (e) {
                current = [];
            }
            current.push(req.body);
            await fs.writeFile(filePath, JSON.stringify(current, null, 2));
        } else {
            // Overwrite mode for other collections
            await fs.writeFile(filePath, JSON.stringify(req.body, null, 2));
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Storage server running on http://localhost:${PORT}`);
});
