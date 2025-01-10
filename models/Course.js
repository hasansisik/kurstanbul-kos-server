const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const instructorSchema = new Schema({
    name: { type: String, required: true },
    age: { type: Number, required: true },
    experienceYear: { type: Number, required: true },
    picture: { type: String, required: true },
    rating: { type: Number, min: 0, max: 5 },
    numReviews: { type: Number, default: 0 },
});

const reviewSchema = new Schema({
    name: { type: String, required: true },
    profile: { type: String, required: true },
    rating: {
        type: Number,
        required: true,
        min: [1, 'Rating can not be less than 1.'],
        max: [5, 'Rating can not be more than 5.']
    },
    comment: { type: String, required: true },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    categories: {
        cat1: { type: Number, min: 1, max: 5 },
        cat2: { type: Number, min: 1, max: 5 },
        cat3: { type: Number, min: 1, max: 5 },
        cat4: { type: Number, min: 1, max: 5 }
    },
    instructorRating: {
        instructor: { type: String, required: true },
        comment: { type: String },
        rating: { type: Number, required: true, default: 0, min: 1, max: 5 }
    }
}, { timestamps: true });

const lessonSchema = new Schema({
    email: { type: String, required: true },
});

const CourseSchema = new Schema(
    {
        title: { type: String, required: true },
        quata: { type: Number, required: true },
        initialQuata: { type: Number },
        opening: { type: String, required: true },
        closing: { type: String, required: true },
        description: { type: String, required: true, maxlength: 400 },
        images: [{ type: String, required: true }],
        location: { type: String, required: true },
        coordinates: {
            latitude: { type: Number, required: true },
            longitude: { type: Number, required: true }
        },
        feature: {
            edu: { type: Boolean, default: true },
            parking: { type: Boolean, default: true },
            clock: { type: Boolean, default: true },
            air: { type: Boolean, default: true },
            hearing: { type: Boolean, default: true },
            wifi: { type: Boolean, default: true },
        },
        licance: {
            M1: { type: Boolean, default: true },
            A1: { type: Boolean, default: true },
            A2: { type: Boolean, default: true },
            A: { type: Boolean, default: true },
            B1: { type: Boolean, default: true },
            B: { type: Boolean, default: true },
            Bi: { type: Boolean, default: true },
            F: { type: Boolean, default: true },
            G: { type: Boolean, default: true },
            YÜZCEZA: { type: Boolean, default: true },
            C: { type: Boolean, default: true },
            CE: { type: Boolean, default: true },
            D: { type: Boolean, default: true },
            C1: { type: Boolean, default: true },
            D1: { type: Boolean, default: true },
            BE: { type: Boolean, default: true },
            C1E: { type: Boolean, default: true },
            D1E: { type: Boolean, default: true },
            DE: { type: Boolean, default: true },
        },
        rating: {
            all: { type: Number, required: true, default: 0 },
            cat1: { type: Number, required: true, default: 0 },
            cat2: { type: Number, required: true, default: 0 },
            cat3: { type: Number, required: true, default: 0 },
            cat4: { type: Number, required: true, default: 0 },
        },
        instructors: [instructorSchema],
        numReviews: { type: Number, required: true, default: 0 },
        reviews: [reviewSchema],
        company: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            required: true
        },
        lessons: [lessonSchema],

    }, { timestamps: true }
);

const Course = mongoose.model('Course', CourseSchema);

module.exports = Course;
