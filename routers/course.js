const express = require("express");
const {
    createCourse,
    getCourse,
    updateCourse,
    deleteCourse,
    addInstructor,
} = require("../controllers/course");
const { isAdmin, isAuthenticated } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/").post(createCourse);

router
  .route("/:id")
  .get(getCourse)
  .put([isAdmin], updateCourse)
  .delete([isAdmin], deleteCourse);

router.route("/:id/instructor").post(addInstructor);

module.exports = router;
