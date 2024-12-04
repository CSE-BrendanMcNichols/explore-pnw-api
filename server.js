const express = require('express');
const cors = require('cors');
const path = require('path');
const Joi = require('joi');
const mongoose = require('mongoose');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

mongoose.connect('mongodb+srv://bmcnich:n9DiCoik94A451Hg@cluster0.1c0rc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('Could not connect to MongoDB:', err));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images/');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
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
        cb(new Error('Only image files are allowed!'));
    }
});

// Destination Schema
const destinationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    location: { type: String, required: true },
    description: { type: String, required: true },
    activities: { type: String, required: true },
    bestTime: { type: String, required: true },
    main_image: { type: String, required: true }
});

const Destination = mongoose.model('Destination', destinationSchema);

// Schedule Schema
const scheduleSchema = new mongoose.Schema({
    destination: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    image: { type: String }
}, {
    timestamps: true
});

const Schedule = mongoose.model('Schedule', scheduleSchema);

// Validation Schema
const scheduleValidationSchema = Joi.object({
    destination: Joi.string().min(3).required(),
    date: Joi.string().required(),
    time: Joi.string().required()
});

app.use(cors());
app.use(express.json());
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(express.static('public'));

// GET destinations
app.get('/api/destinations', async (req, res) => {
    try {
        const destinations = await Destination.find().select('-__v');
        res.json(destinations);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET schedules
app.get('/api/schedule', async (req, res) => {
    try {
        const schedules = await Schedule.find().select('-__v');
        res.json(schedules);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST schedule
app.post('/api/schedule', upload.single('image'), async (req, res) => {
    try {
        const { error } = scheduleValidationSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        const scheduleData = {
            destination: req.body.destination,
            date: req.body.date,
            time: req.body.time
        };

        if (req.file) {
            scheduleData.image = req.file.filename;
        }

        const schedule = new Schedule(scheduleData);
        const savedSchedule = await schedule.save();
        
        res.status(201).json({
            message: 'Schedule added successfully',
            data: savedSchedule
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// PUT schedule
app.put('/api/schedule/:id', upload.single('image'), async (req, res) => {
    try {
        const { error } = scheduleValidationSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        const updateData = {
            destination: req.body.destination,
            date: req.body.date,
            time: req.body.time
        };

        if (req.file) {
            updateData.image = req.file.filename;
        }

        const updatedSchedule = await Schedule.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedSchedule) {
            return res.status(404).json({ message: 'Schedule not found' });
        }

        res.json({
            message: 'Schedule updated successfully',
            data: updatedSchedule
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// DELETE schedule
app.delete('/api/schedule/:id', async (req, res) => {
    try {
        const deletedSchedule = await Schedule.findByIdAndDelete(req.params.id);
        
        if (!deletedSchedule) {
            return res.status(404).json({ message: 'Schedule not found' });
        }

        res.json({ message: 'Schedule deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Seed initial destinations data
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