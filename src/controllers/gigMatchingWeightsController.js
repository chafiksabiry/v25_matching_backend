import GigMatchingWeights from '../models/GigMatchingWeights.js';
import Gig from '../models/Gig.js';

// Create or update matching weights for a gig
export const createOrUpdateWeights = async (req, res) => {
  try {
    const { gigId } = req.params;
    const { categoryWeights } = req.body;

    // Validate gig exists
    const gig = await Gig.findById(gigId);
    if (!gig) {
      return res.status(404).json({ message: 'Gig not found' });
    }

    // Validate category weights
    const validCategories = ['skills', 'activities', 'industries', 'languages', 'destination', 'seniority'];
    const providedCategories = Object.keys(categoryWeights || {});
    
    for (const category of providedCategories) {
      if (!validCategories.includes(category)) {
        return res.status(400).json({ message: `Invalid category: ${category}` });
      }
      if (typeof categoryWeights[category] !== 'number' || 
          categoryWeights[category] < 0 || 
          categoryWeights[category] > 1) {
        return res.status(400).json({ message: `Weight for ${category} must be a number between 0 and 1` });
      }
    }

    // Find existing weights or create new ones
    let weights = await GigMatchingWeights.findOne({ gigId });
    
    if (weights) {
      // Update existing weights
      weights.categoryWeights = { ...weights.categoryWeights, ...categoryWeights };
      await weights.save();
    } else {
      // Create new weights with defaults and provided values
      const defaultWeights = {
        skills: 0.5,
        activities: 0.5,
        industries: 0.5,
        languages: 0.5,
        destination: 0.5,
        seniority: 0.5
      };
      
      weights = new GigMatchingWeights({
        gigId,
        categoryWeights: { ...defaultWeights, ...categoryWeights }
      });
      await weights.save();
    }

    res.status(200).json({
      message: 'Matching weights updated successfully',
      data: weights
    });
  } catch (error) {
    console.error('Error creating/updating matching weights:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get matching weights for a gig
export const getWeights = async (req, res) => {
  try {
    const { gigId } = req.params;

    // Validate gig exists
    const gig = await Gig.findById(gigId);
    if (!gig) {
      return res.status(404).json({ message: 'Gig not found' });
    }

    let weights = await GigMatchingWeights.findOne({ gigId });
    
    if (!weights) {
      // Create default weights if none exist
      weights = new GigMatchingWeights({
        gigId,
        categoryWeights: {
          skills: 0.5,
          activities: 0.5,
          industries: 0.5,
          languages: 0.5,
          destination: 0.5,
          seniority: 0.5
        }
      });
      await weights.save();
    }

    res.status(200).json({
      message: 'Matching weights retrieved successfully',
      data: weights
    });
  } catch (error) {
    console.error('Error getting matching weights:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete matching weights for a gig
export const deleteWeights = async (req, res) => {
  try {
    const { gigId } = req.params;

    const weights = await GigMatchingWeights.findOneAndDelete({ gigId });
    
    if (!weights) {
      return res.status(404).json({ message: 'Matching weights not found' });
    }

    res.status(200).json({
      message: 'Matching weights deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting matching weights:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Reset weights to defaults
export const resetWeights = async (req, res) => {
  try {
    const { gigId } = req.params;

    // Validate gig exists
    const gig = await Gig.findById(gigId);
    if (!gig) {
      return res.status(404).json({ message: 'Gig not found' });
    }

    let weights = await GigMatchingWeights.findOne({ gigId });
    
    if (!weights) {
      weights = new GigMatchingWeights({ gigId });
    }
    
    await weights.resetToDefaults();

    res.status(200).json({
      message: 'Matching weights reset to defaults',
      data: weights
    });
  } catch (error) {
    console.error('Error resetting matching weights:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all gigs with their matching weights
export const getAllGigsWithWeights = async (req, res) => {
  try {
    const gigs = await Gig.find();
    const weights = await GigMatchingWeights.find();
    
    const gigsWithWeights = gigs.map(gig => {
      const gigWeights = weights.find(w => w.gigId.toString() === gig._id.toString());
      return {
        gig,
        weights: gigWeights ? gigWeights.categoryWeights : {
          skills: 0.5,
          activities: 0.5,
          industries: 0.5,
          languages: 0.5,
          destination: 0.5,
          seniority: 0.5
        }
      };
    });

    res.status(200).json({
      message: 'Gigs with weights retrieved successfully',
      data: gigsWithWeights
    });
  } catch (error) {
    console.error('Error getting gigs with weights:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}; 