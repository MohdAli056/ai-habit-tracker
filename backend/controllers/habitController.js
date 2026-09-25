import mongoose from 'mongoose';
import Habit from '../models/Habit.js';

/**
 * List habits for the authenticated user.
 * GET /api/habits
 */
export async function listHabits(req, res, next) {
  try {
    const { archived, category, search } = req.query;
    const filter = { userId: req.user._id };

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

/**
 * Get a specific habit by ID.
 * GET /api/habits/:id
 */
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

/**
 * Create a new habit for the authenticated user.
 * POST /api/habits
 */
export async function createHabit(req, res, next) {
  try {
    const { name, description, category, frequency, targetDays, color, icon } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: 'Habit name is required.' });
    }

    const last = await Habit.findOne({ userId: req.user._id, isArchived: false })
      .sort({ order: -1 })
      .select('order');
    const order = last ? last.order + 1 : 0;

    const habit = await Habit.create({
      userId: req.user._id,
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

/**
 * Reorder habits sequence.
 * PUT /api/habits/reorder
 */
export async function reorderHabits(req, res, next) {
  try {
    const { orderedIds } = req.body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ message: 'orderedIds must be a non-empty array.' });
    }

    const owned = await Habit.find({
      _id: { $in: orderedIds },
      userId: req.user._id,
    }).select('_id');

    const ownedSet = new Set(owned.map((h) => String(h._id)));
    const allOwned = orderedIds.every((id) => ownedSet.has(String(id)));

    if (!allOwned || owned.length !== orderedIds.length) {
      return res.status(403).json({ message: 'One or more habit IDs are invalid or not yours.' });
    }

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

/**
 * Update an existing habit.
 * PUT /api/habits/:id
 */
export async function updateHabit(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Habit not found.' });
    }
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user._id });
    if (!habit) return res.status(404).json({ message: 'Habit not found.' });

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

/**
 * Delete a habit by ID.
 * DELETE /api/habits/:id
 */
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
