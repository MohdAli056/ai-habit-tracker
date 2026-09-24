/**
 * Habit controller.
 *
 * All handlers enforce userId === req.user._id.
 * The client can never supply a userId that overrides the authenticated user.
 */

import mongoose from 'mongoose';
import Habit from '../models/Habit.js';

// ---------------------------------------------------------------------------
// GET /api/habits
// Query: archived=true|false, category=<string>, search=<string>
// ---------------------------------------------------------------------------
export async function listHabits(req, res, next) {
  try {
    const { archived, category, search } = req.query;

    const filter = { userId: req.user._id };

    // Archive filter — default to active habits (archived=false)
    if (archived === 'true') {
      filter.isArchived = true;
    } else {
      filter.isArchived = false;
    }

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: rx }, { description: rx }];
    }

    const habits = await Habit.find(filter).sort({ order: 1, createdAt: 1 });
    res.json({ habits });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/habits/:id
// ---------------------------------------------------------------------------
export async function getHabit(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Habit not found.' });
    }
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user._id });
    if (!habit) return res.status(404).json({ message: 'Habit not found.' });
    res.json({ habit });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/habits
// ---------------------------------------------------------------------------
export async function createHabit(req, res, next) {
  try {
    const { name, description, category, frequency, targetDays, color, icon } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: 'Habit name is required.' });
    }

    // Set order to one after the current highest for this user's active habits.
    const last = await Habit.findOne({ userId: req.user._id, isArchived: false })
      .sort({ order: -1 })
      .select('order');
    const order = last ? last.order + 1 : 0;

    const habit = await Habit.create({
      userId: req.user._id, // always from auth, never from body
      name,
      description,
      category,
      frequency,
      targetDays,
      color,
      icon,
      order,
    });

    res.status(201).json({ habit });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// PUT /api/habits/reorder  — MUST be registered before /:id
// Body: { orderedIds: [id1, id2, id3] }
// ---------------------------------------------------------------------------
export async function reorderHabits(req, res, next) {
  try {
    const { orderedIds } = req.body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ message: 'orderedIds must be a non-empty array.' });
    }

    // Verify every supplied ID actually belongs to this user.
    const owned = await Habit.find({
      _id: { $in: orderedIds },
      userId: req.user._id,
    }).select('_id');

    const ownedSet = new Set(owned.map((h) => String(h._id)));
    const allOwned = orderedIds.every((id) => ownedSet.has(String(id)));

    if (!allOwned || owned.length !== orderedIds.length) {
      return res.status(403).json({ message: 'One or more habit IDs are invalid or not yours.' });
    }

    // Bulk-update order values.
    await Promise.all(
      orderedIds.map((id, index) =>
        Habit.updateOne({ _id: id, userId: req.user._id }, { $set: { order: index } }),
      ),
    );

    res.json({ message: 'Habits reordered.' });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// PUT /api/habits/:id
// ---------------------------------------------------------------------------
export async function updateHabit(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Habit not found.' });
    }
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user._id });
    if (!habit) return res.status(404).json({ message: 'Habit not found.' });

    // Explicitly allow only the permitted update fields.
    const allowed = ['name', 'description', 'category', 'frequency', 'targetDays', 'color', 'icon', 'isArchived'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) {
        habit[field] = req.body[field];
      }
    });

    await habit.save();
    res.json({ habit });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/habits/:id
// ---------------------------------------------------------------------------
export async function deleteHabit(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Habit not found.' });
    }
    const result = await Habit.deleteOne({ _id: req.params.id, userId: req.user._id });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Habit not found.' });
    res.json({ message: 'Habit deleted.' });
  } catch (err) {
    next(err);
  }
}
