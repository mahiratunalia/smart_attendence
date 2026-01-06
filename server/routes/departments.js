// server/src/routes/departments.js (or .ts)
import { Router } from "express";
import Department from "../models/Department.js"; // Add .js if using ES modules
import { protect, authorize } from "../middleware/auth.js";

const router = Router();

// PUBLIC: Get all departments (NO AUTH REQUIRED)
router.get("/", async (req, res) => {
  try {
    console.log("📋 Fetching departments...");
    const departments = await Department.find().sort({ name: 1 });
    console.log(`✅ Found ${departments.length} departments`);
    res.json(departments);
  } catch (err) {
    console.error("❌ Error fetching departments", err);
    res.status(500).json({ message: "Failed to load departments" });
  }
});

// PROTECTED: Create department (requires admin auth)
router.post("/", protect, authorize('admin'), async (req, res) => {
  try {
    const { name, code } = req.body;
    
    // Check if department already exists
    const existing = await Department.findOne({ $or: [{ name }, { code }] });
    if (existing) {
      return res.status(400).json({ message: "Department already exists" });
    }
    
    const department = new Department({ name, code });
    await department.save();
    console.log(`✅ Created department: ${name} (${code})`);
    res.status(201).json(department);
  } catch (err) {
    console.error("❌ Error creating department", err);
    res.status(500).json({ message: "Failed to create department" });
  }
});

// PROTECTED: Delete department (requires admin auth)
router.delete("/:id", protect, authorize('admin'), async (req, res) => {
  try {
    const deleted = await Department.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Department not found' });
    }
    res.json({ success: true, message: 'Department deleted' });
  } catch (err) {
    console.error('❌ Error deleting department', err);
    res.status(500).json({ message: 'Failed to delete department' });
  }
});

export default router;