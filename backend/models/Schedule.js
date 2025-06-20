const mongoose = require('mongoose');

const ScheduleSchema = new mongoose.Schema({
  driverId: String,
  user_ID: String,
  day: Date,
  service: String,
  week: String,
  site: String,
  addedBy: Object,
  acknowledged: Boolean,
  associatedRateCard: String,
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed'],
    default: 'not_started',
  },
});

ScheduleSchema.index({ user_ID: 1, day: 1 });
ScheduleSchema.index({ week: 1, site: 1 });
ScheduleSchema.index({ driverId: 1, day: 1 }, { unique: true });


const Schedule = mongoose.model('Schedule', ScheduleSchema);

module.exports = Schedule;
