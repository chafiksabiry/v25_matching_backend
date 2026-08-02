import GigMatchingWeights from '../models/GigMatchingWeights.js';
import Gig from '../models/Gig.js';

// Create or update matching weights for a gig
export const createOrUpdateWeights = async (req, res) => {
  try {
    const { gigId } = req.params;
    const { matchingWeights } = req.body;

    // Validate gig exists
    const gig = await Gig.findById(gigId);
    if (!gig) {
      return res.status(404).json({ message: 'Gig not found' });
    }

    // Validate matching weights
    const validCategories = ['experience', 'skills', 'industry', 'languages', 'availability', 'timezone', 'activities', 'region'];
    const providedCategories = Object.keys(matchingWeights || {});
    
    for (const category of providedCategories) {
      if (!validCategories.includes(category)) {
        return res.status(400).json({ message: `Invalid category: ${category}` });
      }
      if (typeof matchingWeights[category] !== 'number' || 
          matchingWeights[category] < 0 || 
          matchingWeights[category] > 1) {
        return res.status(400).json({ message: `Weight for ${category} must be a number between 0 and 1` });
      }
    }

    // Find existing weights or create new ones
    let weights = await GigMatchingWeights.findOne({ gigId });
    
    if (weights) {
      // Update existing weights
      weights.matchingWeights = { ...weights.matchingWeights, ...matchingWeights };
      await weights.save();
    } else {
      // Create new weights with defaults and provided values
      const defaultWeights = {
        experience: 0.20,
        skills: 0.20,
        industry: 0.15,
        languages: 0.15,
        availability: 0.10,
        timezone: 0.10,
        activities: 0.10,
        region: 0.10
      };
      
      weights = new GigMatchingWeights({
        gigId,
        matchingWeights: { ...defaultWeights, ...matchingWeights }
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

    const weights = await GigMatchingWeights.findOne({ gigId });
    
    if (!weights) {
      // Return 404 instead of creating default weights
      return res.status(404).json({ message: 'No matching weights found for this gig' });
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
        weights: gigWeights ? gigWeights.matchingWeights : {
          experience: 0.20,
          skills: 0.20,
          industry: 0.15,
          languages: 0.15,
          availability: 0.10,
          timezone: 0.10,
          activities: 0.10,
          region: 0.10
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