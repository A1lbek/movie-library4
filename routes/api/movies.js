const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const { getMoviesCollection } = require('../../database/mongodb');

// Валидация ObjectId
const isValidObjectId = (id) => {
  return ObjectId.isValid(id) && (String)(new ObjectId(id)) === id;
};

// GET /api/movies - все фильмы с фильтрацией, сортировкой, проекцией
router.get('/', async (req, res) => {
  try {
    const collection = getMoviesCollection();
    let query = {};
    let sort = {};
    let projection = {};

    // Фильтрация
    if (req.query.genre) query.genre = req.query.genre;
    if (req.query.year) query.year = parseInt(req.query.year);
    if (req.query.year_min) query.year = { $gte: parseInt(req.query.year_min) };
    if (req.query.year_max) query.year = { ...query.year, $lte: parseInt(req.query.year_max) };
    if (req.query.director) query.director = { $regex: req.query.director, $options: 'i' };
    if (req.query.title) query.title = { $regex: req.query.title, $options: 'i' };

    // Сортировка
    if (req.query.sortBy) {
      const order = req.query.order === 'desc' ? -1 : 1;
      sort[req.query.sortBy] = order;
    } else {
      sort.title = 1; // Сортировка по умолчанию
    }

    // Проекция (выбор полей)
    if (req.query.fields) {
      const fields = req.query.fields.split(',');
      fields.forEach(field => {
        projection[field] = 1;
      });
    }

    const movies = await collection
      .find(query)
      .project(projection)
      .sort(sort)
      .toArray();
    
    res.status(200).json({
      count: movies.length,
      movies
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/movies/:id - один фильм по ID
router.get('/:id', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const collection = getMoviesCollection();
    const movie = await collection.findOne({ 
      _id: new ObjectId(req.params.id) 
    });

    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    res.status(200).json(movie);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/movies - создать новый фильм
router.post('/', async (req, res) => {
  try {
    const { title, year, director, genre, duration, rating, description } = req.body;
    
    // Валидация
    if (!title || !year || !director || !genre) {
      return res.status(400).json({ 
        error: 'Missing required fields: title, year, director, genre' 
      });
    }

    if (isNaN(year)) {
      return res.status(400).json({ error: 'Year must be a number' });
    }

    const collection = getMoviesCollection();
    const movie = {
      title,
      year: parseInt(year),
      director,
      genre: Array.isArray(genre) ? genre : [genre],
      duration: duration ? parseInt(duration) : null,
      rating: rating ? parseFloat(rating) : null,
      description: description || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await collection.insertOne(movie);
    
    res.status(201).json({
      _id: result.insertedId,
      ...movie
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/movies/:id - обновить фильм
router.put('/:id', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const collection = getMoviesCollection();
    
    // Проверяем существование фильма
    const existingMovie = await collection.findOne({ 
      _id: new ObjectId(req.params.id) 
    });

    if (!existingMovie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    const updateData = { 
      ...req.body, 
      updatedAt: new Date() 
    };
    
    // Удаляем _id из данных обновления
    delete updateData._id;
    delete updateData.createdAt;

    // Если genre - массив
    if (updateData.genre && !Array.isArray(updateData.genre)) {
      updateData.genre = [updateData.genre];
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateData }
    );

    res.status(200).json({ 
      message: 'Movie updated successfully',
      modifiedCount: result.modifiedCount 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/movies/:id - удалить фильм
router.delete('/:id', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const collection = getMoviesCollection();
    const result = await collection.deleteOne({ 
      _id: new ObjectId(req.params.id) 
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    res.status(200).json({ 
      message: 'Movie deleted successfully',
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;