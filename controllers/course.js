const Course = require("../models/Course");

const createCourse = async (req, res) => {
    const { title, quata, opening, closing, description, images, location, coordinates, feature, licance } = req.body;

    if (!title || !quata || !opening || !closing || !description || !images || !location || !coordinates || !feature || !licance) {
        return res.status(400).json({
            success: false,
            error: "All fields are required"
        });
    }

    try {
        const course = new Course({
            title,
            quata,
            opening,
            closing,
            description,
            images,
            location,
            coordinates,
            feature,
            licance, // licance doğrudan kullanılıyor
            initialQuata: quata // ilk quata değerini saklayın
        });

        await course.save();

        res.status(201).json({
            success: true,
            data: course
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

const getCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({
                success: false,
                error: 'No course found'
            });
        }
        res.status(200).json({
            course
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

const updateCourse = async (req, res) => {
    try {
        const course = await Course.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        if (!course) {
            return res.status(404).json({
                success: false,
                error: 'No course found'
            });
        }
        res.status(200).json({
            success: true,
            data: course
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

const deleteCourse = async (req, res) => {
    try {
        const course = await Course.findByIdAndDelete(req.params.id);
        if (!course) {
            return res.status(404).json({
                success: false,
                error: 'No course found'
            });
        }
        res.status(200).json({
            success: true,
            message: 'Course deleted'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

const addInstructor = async (req, res) => {
    try {
        const { name, age, experienceYear, picture } = req.body;
        const course = await Course.findById(req.params.id);

        if (course) {
            const instructor = {
                name,
                age: Number(age),
                experienceYear: Number(experienceYear),
                picture,
                rating: 0
            };

            course.instructors.push(instructor);

            await course.save();
            res.status(200).json(course.instructors);
        } else {
            res.status(404);
            throw new Error("Course not found");
        }
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: error.message });
    }
};


module.exports = {
    createCourse,
    getCourse,
    updateCourse,
    deleteCourse,
    addInstructor,
};

