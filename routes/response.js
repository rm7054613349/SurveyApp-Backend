const express = require('express');
const router = express.Router();
const Response = require('../models/Response');
const Survey = require('../models/Survey');
const User = require('../models/User');
const Subsection = require('../models/Subsection');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');
const { calculateHardScore } = require('../utils/scoring');
const { sendEmail } = require('../utils/sendEmail');

// Submit responses for a subsection
// router.post('/submit/:subsectionId', authMiddleware, async (req, res) => {
//   try {
//     const { responses } = req.body;
//     const subsectionId = req.params.subsectionId;
//     const userId = req.user.id;

//     if (!responses || !Array.isArray(responses)) {
//       return res.status(400).json({ message: 'Invalid responses' });
//     }

//     let totalScore = 0;
//     let maxPossibleScore = 0;
//     const responseDetails = [];

//     const surveys = await Survey.find({ subsection: subsectionId });
//     for (const survey of surveys) {
//       const resp = responses.find(r => r.surveyId === survey._id.toString());
//       let score = 0;
//       let answer = '';

//       if (resp) {
//         if (survey.questionType === 'multiple-choice') {
//           if (!survey.options.includes(resp.answer)) {
//             return res.status(400).json({ message: `Invalid answer for survey ${survey._id}` });
//           }
//           if (survey.scoringType === 'hard') {
//             score = calculateHardScore(resp.answer, survey.correctOption, survey.maxScore);
//           } else {
//             score = resp.answer === survey.correctOption ? survey.maxScore : 0;
//           }
//           answer = resp.answer;
//         } else if (survey.questionType === 'descriptive') {
//           score = survey.maxScore; // Placeholder for manual scoring
//           answer = resp.answer;
//         } else if (survey.questionType === 'file-upload') {
//           if (!resp.fileUrl) {
//             return res.status(400).json({ message: `File URL required for survey ${survey._id}` });
//           }
//           score = survey.maxScore; // Placeholder for manual scoring
//           answer = resp.fileUrl;
//         }
//       }

//       totalScore += score;
//       maxPossibleScore += survey.maxScore;

//       const newResponse = new Response({
//         user: userId,
//         survey: survey._id,
//         subsection: subsectionId,
//         answer: survey.questionType !== 'file-upload' ? answer : null,
//         fileUrl: survey.questionType === 'file-upload' ? answer : null,
//         score,
//       });
//       await newResponse.save();

//       responseDetails.push({
//         question: survey.question,
//         userAnswer: answer || 'Not answered',
//         correctAnswer: survey.correctOption || 'N/A',
//         score,
//         maxScore: survey.maxScore,
//       });
//     }

    // Badge assignment
//     const percentage = (totalScore / maxPossibleScore) * 100;
//     if (percentage >= 70) {
//       const user = await User.findById(userId);
//       const subsections = await Subsection.find().sort('order');
//       const currentSubsection = await Subsection.findById(subsectionId);
//       const currentOrder = currentSubsection.order;

//       if (currentOrder === 1 && !user.badges.includes('bronze')) {
//         user.badges.push('bronze');
//         await user.save();
//       } else if (currentOrder === 2 && !user.badges.includes('silver')) {
//         user.badges.push('silver');
//         await user.save();
//       } else if (currentOrder === 3 && !user.badges.includes('gold')) {
//         user.badges.push('gold');
//         await user.save();
//       }
//     }

//     res.status(201).json({
//       message: 'Responses submitted',
//       totalScore,
//       maxPossibleScore,
//       responseDetails,
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// Get scores for a user
router.get('/score/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const responses = await Response.find({ user: userId }).populate('survey');
    const subsections = await Subsection.find();

    const scores = {};
    for (const subsection of subsections) {
      const surveys = await Survey.find({ subsection: subsection._id });
      let totalScore = 0;
      let totalMaxScore = 0;
      for (const survey of surveys) {
        const response = responses.find(r => r.survey._id.toString() === survey._id.toString());
        totalScore += response ? response.score : 0;
        totalMaxScore += survey.maxScore;
      }
      scores[subsection._id] = { score: totalScore, maxScore: totalMaxScore };
    }
    res.json(scores);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Assign badges
router.get('/badges/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    const subsections = await Subsection.find().sort({ order: 1 });
    const responses = await Response.find({ user: userId }).populate('survey');

    let badges = user.badges || [];

    for (const subsection of subsections) {
      const surveys = await Survey.find({ subsection: subsection._id });
      let totalScore = 0;
      let totalMaxScore = 0;
      for (const survey of surveys) {
        const response = responses.find(r => r.survey._id.toString() === survey._id.toString());
        totalScore += response ? response.score : 0;
        totalMaxScore += survey.maxScore;
      }
      const percentage = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
      const order = subsection.order;

      if (percentage >= 70) {
        if (order === 1 && !badges.includes('bronze')) badges.push('bronze');
        if (order === 2 && !badges.includes('silver')) badges.push('silver');
        if (order === 3 && !badges.includes('gold')) badges.push('gold');
      }
    }

    await User.findByIdAndUpdate(userId, { badges }, { new: true });
    res.json({ badges });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get responses for ThankYou page
// router.get('/subsection/:subsectionId', authMiddleware, async (req, res) => {
//   try {
//     const responses = await Response.find({
//       user: req.user.id,
//       subsection: req.params.subsectionId,
//     }).populate('survey');

//     let totalScore = 0;
//     let maxPossibleScore = 0;
//     const responseDetails = responses.map(r => {
//       totalScore += r.score;
//       maxPossibleScore += r.survey.maxScore;
//       return {
//         question: r.survey.question,
//         userAnswer: r.answer || r.fileUrl || 'Not answered',
//         correctAnswer: r.survey.correctOption || 'N/A',
//         score: r.score,
//         maxScore: r.survey.maxScore,
//       };
//     });

//     res.json({ totalScore, maxPossibleScore, responseDetails });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });


// router.get('/subsection/:subsectionId', authMiddleware, async (req, res) => {
//   try {
//     const responses = await Response.find({ subsection: req.params.subsectionId })
//       .populate({
//         path: 'surveyId',
//         populate: { path: 'categoryId' }
//       })
//       .populate('user');
//     console.log(`Fetched responses for subsection ${req.params.subsectionId}:`, {
//       count: responses.length,
//       responses: responses.map(r => ({
//         _id: r._id,
//         surveyId: r.surveyId?._id,
//         question: r.surveyId?.question,
//         answer: r.answer,
//         correctOption: r.surveyId?.correctOption
//       }))
//     });
//     res.json(responses || []);
//   } catch (error) {
//     console.error('Error fetching responses:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

router.get('/subsection/:subsectionId', authMiddleware, async (req, res) => {
  try {
    const responses = await Response.find({ subsection: req.params.subsectionId })
      .populate({
        path: 'survey',
        populate: { path: 'categoryId' }
      })
      .populate('user');

    console.log(`Fetched responses for subsection ${req.params.subsectionId}:`, {
      count: responses.length,
      responses: responses.map(r => ({
        _id: r._id,
        survey: r.survey?._id,
        question: r.survey?.question,
        answer: r.answer,
        correctOption: r.survey?.correctOption,
        categoryId: r.survey?.categoryId?._id
      }))
    });

    res.json(responses || []);
  } catch (error) {
    console.error('Error fetching responses:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/submit/:subsectionId', authMiddleware, async (req, res) => {
  try {
    const { responses } = req.body;
    const subsectionId = req.params.subsectionId;
    const userId = req.user.id;

    if (!Array.isArray(responses)) {
      console.error('Responses must be an array:', responses);
      return res.status(400).json({ message: 'Responses must be an array' });
    }

    // Validate each response has a survey field
    const invalidResponses = responses.filter(response => !response.survey);
    if (invalidResponses.length > 0) {
      console.error('Invalid responses missing survey:', invalidResponses);
      return res.status(400).json({ message: 'All responses must include a survey ID' });
    }

    const savedResponses = await Promise.all(
      responses.map(async response => {
        const newResponse = new Response({
          user: userId,
          survey: response.survey,
          subsection: subsectionId,
          answer: response.answer,
          score: response.answer && response.survey // Ensure survey exists
            ? response.answer === response.correctOption ? 1 : 0
            : 0
        });
        return await newResponse.save();
      })
    );

    await Response.populate(savedResponses, [
      { path: 'survey', populate: { path: 'categoryId' } },
      { path: 'user' }
    ]);

    console.log(`Saved ${savedResponses.length} responses for subsection ${subsectionId}`);

    res.json(savedResponses);
  } catch (error) {
    console.error('Error submitting responses:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all responses (Admin only)
router.get('/', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const responses = await Response.find()
      .populate('user', 'email role')
      .populate({
        path: 'survey',
        populate: [
          { path: 'category', select: 'name' },
          { path: 'section', select: 'name' },
          { path: 'subsection', select: 'name' },
        ],
      });
    res.json(responses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get my responses
router.get('/my-responses', authMiddleware, async (req, res) => {
  try {
    const responses = await Response.find({ user: req.user.id })
      .populate('user', 'email')
      .populate({
        path: 'survey',
        populate: [
          { path: 'category', select: 'name' },
          { path: 'section', select: 'name' },
          { path: 'subsection', select: 'name' },
        ],
      });
    res.json(responses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Send report by user, section, and subsection
router.post('/report-by-user', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  const { userId, sectionId, subsectionId, date } = req.body;
  try {
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    let query = { user: userId };
    if (sectionId) query['survey.section'] = sectionId;
    if (subsectionId) query['survey.subsection'] = subsectionId;
    if (date) {
      const start = new Date(date);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      query.createdAt = { $gte: start, $lt: end };
    }

    const responses = await Response.find(query)
      .populate({
        path: 'survey',
        populate: [
          { path: 'category', select: 'name' },
          { path: 'section', select: 'name' },
          { path: 'subsection', select: 'name' },
        ],
      });

    if (!responses.length) {
      return res.status(404).json({ message: 'No responses found' });
    }

    const groupedResponses = responses.reduce((acc, response) => {
      const sectionName = response.survey.section?.name || 'Uncategorized';
      const subsectionName = response.survey.subsection?.name || 'Uncategorized';
      const categoryName = response.survey.category?.name || 'Uncategorized';

      if (!acc[sectionName]) acc[sectionName] = {};
      if (!acc[sectionName][subsectionName]) acc[sectionName][subsectionName] = {};
      if (!acc[sectionName][subsectionName][categoryName]) {
        acc[sectionName][subsectionName][categoryName] = {
          score: 0,
          total: 0,
          responses: [],
        };
      }

      acc[sectionName][subsectionName][categoryName].responses.push({
        question: response.survey.question,
        answer: response.answer || response.fileUrl || 'N/A',
        score: response.score ?? 0,
        questionType: response.survey.questionType,
        correctOption: response.survey.correctOption || 'N/A',
      });
      acc[sectionName][subsectionName][categoryName].score += response.score ?? 0;
      acc[sectionName][subsectionName][categoryName].total += response.survey.maxScore;
      return acc;
    }, {});

    const totalScore = Object.values(groupedResponses).reduce((sum, sections) => {
      return sum + Object.values(sections).reduce((subSum, subsections) => {
        return subSum + Object.values(subsections).reduce((catSum, cat) => catSum + cat.score, 0);
      }, 0);
    }, 0);

    const totalPossible = Object.values(groupedResponses).reduce((sum, sections) => {
      return sum + Object.values(sections).reduce((subSum, subsections) => {
        return subSum + Object.values(subsections).reduce((catSum, cat) => catSum + cat.total, 0);
      }, 0);
    }, 0);

    const percentage = totalPossible > 0 ? ((totalScore / totalPossible) * 100).toFixed(2) : 0;

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: 'Inter', sans-serif; color: #333; background-color: #f4f4f4; padding: 20px; margin: 0; }
            .container { max-width: 800px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            h1 { color: #2563eb; text-align: center; font-size: 28px; margin-bottom: 20px; }
            .summary-card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 24px; margin-bottom: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            .summary-card h2 { font-size: 24px; font-weight: 800; color: #1f2937; text-align: center; margin-bottom: 24px; }
            .summary-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-radius: 8px; margin-bottom: 12px; }
            .summary-item.blue { background-color: #dbeafe; }
            .summary-item.green { background-color: #dcfce7; }
            .summary-item.purple { background-color: #f3e8ff; }
            .summary-item .label { font-size: 18px; color: #374151; }
            .summary-item .value { font-size: 18px; font-weight: 700; }
            .summary-item.blue .value { color: #2563eb; }
            .summary-item.green .value { color: #16a34a; }
            .summary-item.purple .value { color: #9333ea; }
            h3 { color: #16a34a; font-size: 20px; margin-top: 20px; margin-bottom: 10px; }
            h4 { color: #2563eb; font-size: 18px; margin-top: 15px; margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; font-size: 14px; }
            th { background-color: #2563eb; color: #ffffff; font-weight: bold; }
            td { background-color: #f9fafb; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Survey Report for ${user.email}</h1>
            <div class="summary-card">
              <h2>Your Performance</h2>
              <div class="summary-item blue">
                <span class="label">Gained Marks:</span>
                <span class="value"> ${totalScore}</span>
              </div>
              <div class="summary-item green">
                <span class="label">Total Marks:</span>
                <span class="value"> ${totalPossible}</span>
              </div>
              <div class="summary-item purple">
                <span class="label">Percentage:</span>
                <span class="value"> ${percentage}%</span>
              </div>
            </div>
            ${Object.entries(groupedResponses).map(([section, subsections]) => `
              <h3>Section: ${section}</h3>
              ${Object.entries(subsections).map(([subsection, categories]) => `
                <h4>Subsection: ${subsection}</h4>
                ${Object.entries(categories).map(([category, data]) => `
                  <p>Category: ${category}</p>
                  <p>Score: ${data.score} / ${data.total}</p>
                  <table>
                    <thead>
                      <tr>
                        <th>Question</th>
                        <th>Answer</th>
                        <th>Score</th>
                        <th>Correct Answer</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${data.responses.map(resp => `
                        <tr>
                          <td>${resp.question}</td>
                          <td>${resp.answer}</td>
                          <td>${resp.score}</td>
                          <td>${resp.questionType === 'multiple-choice' ? resp.correctOption : 'N/A'}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                `).join('')}
              `).join('')}
            `).join('')}
            <div class="footer">
              <p>Generated by Assessment | Thank you for your participation!</p>
            </div>
          </div>
        </body>
      </html>
    `;
    await sendEmail(user.email, 'Your Survey Report', null, htmlContent);
    res.json({ message: 'Report sent successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get report data for ShowReport
router.get('/report-data', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const { date } = req.query;
    let query = {};
    if (date) {
      const start = new Date(date);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      query.createdAt = { $gte: start, $lt: end };
    }

    const responses = await Response.find(query)
      .populate('user', 'email')
      .populate('survey')
      .populate('subsection');

    const reportData = responses.map(r => ({
      userEmail: r.user.email,
      subsection: r.subsection.name,
      question: r.survey.question,
      answer: r.answer || r.fileUrl || 'Not answered',
      score: r.score,
      maxScore: r.survey.maxScore,
      date: r.createdAt,
    }));

    res.json(reportData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;