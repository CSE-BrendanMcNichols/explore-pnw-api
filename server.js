const express = require('express');
const cors = require('cors');
const path = require('path');
const Joi = require('joi');
const mongoose = require('mongoose');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const imagesDir = path.join(__dirname, 'images');
if (!fs.existsSync(imagesDir)){
    fs.mkdirSync(imagesDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only .png, .jpg and .jpeg formats are allowed!'));
    },
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

mongoose.connect('mongodb+srv://bmcnich:n9DiCoik94A451Hg@cluster0.1c0rc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('Could not connect to MongoDB:', err));

const destinationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    location: { type: String, required: true },
    description: { type: String, required: true },
    activities: { type: String, required: true },
    bestTime: { type: String, required: true },
    main_image: { type: String, required: true }
});

const Destination = mongoose.model('Destination', destinationSchema);

const scheduleSchema = new mongoose.Schema({
    destination: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    image: { 
        filename: { type: String },
        originalName: { type: String },
        mimetype: { type: String },
        path: { type: String }
    }
}, {
    timestamps: true
});

const Schedule = mongoose.model('Schedule', scheduleSchema);

const scheduleValidationSchema = Joi.object({
    destination: Joi.string().min(3).required(),
    date: Joi.string().required(),
    time: Joi.string().required(),
    image: Joi.object({
        filename: Joi.string(),
        originalName: Joi.string(),
        mimetype: Joi.string(),
        path: Joi.string()
    }).allow(null)
});

app.use(cors());
app.use(express.json());
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(express.static('public'));

app.get('/api/destinations', async (req, res) => {
    try {
        const destinations = await Destination.find().select('-__v');
        res.json(destinations);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/schedule', async (req, res) => {
    try {
        const schedules = await Schedule.find().select('-__v');
        res.json(schedules);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/schedule', upload.single('image'), async (req, res) => {
    try {
        const scheduleData = {
            destination: req.body.destination,
            date: req.body.date,
            time: req.body.time,
        };

        if (req.file) {
            scheduleData.image = {
                filename: req.file.filename,
                originalName: req.file.originalname,
                mimetype: req.file.mimetype,
                path: req.file.path
            };
        }

        const { error } = scheduleValidationSchema.validate(scheduleData);
        if (error) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({ message: error.details[0].message });
        }

        const schedule = new Schedule(scheduleData);
        const savedSchedule = await schedule.save();
        
        res.status(201).json({
            message: 'Schedule added successfully',
            data: savedSchedule
        });
    } catch (error) {
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        res.status(400).json({ message: error.message });
    }
});

app.put('/api/schedule/:id', upload.single('image'), async (req, res) => {
    try {
        if (!req.params.id) {
            return res.status(400).json({ message: 'Schedule ID is required' });
        }

        const existingSchedule = await Schedule.findById(req.params.id);
        if (!existingSchedule) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(404).json({ message: 'Schedule not found' });
        }

        const updateData = {
            destination: req.body.destination,
            date: req.body.date,
            time: req.body.time
        };

        if (req.file) {
            updateData.image = {
                filename: req.file.filename,
                originalName: req.file.originalname,
                mimetype: req.file.mimetype,
                path: req.file.path
            };

            if (existingSchedule.image && existingSchedule.image.path) {
                try {
                    fs.unlinkSync(existingSchedule.image.path);
                } catch (err) {
                    console.error('Error deleting old image:', err);
                }
            }
        }

        const { error } = scheduleValidationSchema.validate(updateData);
        if (error) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({ message: error.details[0].message });
        }

        const updatedSchedule = await Schedule.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        res.json({
            message: 'Schedule updated successfully',
            data: updatedSchedule
        });
    } catch (error) {
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid schedule ID format' });
        }
        res.status(400).json({ message: error.message });
    }
});

app.delete('/api/schedule/:id', async (req, res) => {
    try {
        const schedule = await Schedule.findById(req.params.id);
        if (!schedule) {
            return res.status(404).json({ message: 'Schedule not found' });
        }

        if (schedule.image && schedule.image.path) {
            try {
                fs.unlinkSync(schedule.image.path);
            } catch (err) {
                console.error('Error deleting image:', err);
            }
        }

        await Schedule.findByIdAndDelete(req.params.id);
        res.json({ message: 'Schedule deleted successfully' });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid schedule ID format' });
        }
        res.status(500).json({ message: error.message });
    }
});

const seedDestinations = async () => {
    try {
        const count = await Destination.countDocuments();
        if (count === 0) {
            const destinationsData = require('./destinations');
            const formattedData = destinationsData.map(({ _id, ...rest }) => rest);
            await Destination.insertMany(formattedData);
            console.log('Destinations data seeded successfully');
        } else {
            console.log('Destinations collection is not empty, skipping seed');
        }
    } catch (error) {
        console.error('Error seeding destinations:', error);
    }
};

mongoose.connection.once('open', () => {
    seedDestinations();
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});