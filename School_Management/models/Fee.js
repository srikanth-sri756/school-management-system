const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  paymentMethod: { type: String, enum: ['Cash', 'Online', 'Cheque', 'Card'], default: 'Cash' },
  transactionId: { type: String },
  receivedBy: { type: String },
  remarks: { type: String }
});

const InstallmentSchema = new mongoose.Schema({
  installmentNumber: { type: Number, required: true },
  amount: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  paidAmount: { type: Number, default: 0 },
  paidDate: { type: Date },
  status: { type: String, enum: ['Pending', 'Paid', 'Partial', 'Overdue'], default: 'Pending' },
  notes: { type: String }
});

const FeeSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  term: { type: String, required: true },
  amount: { type: Number, required: true },
  paid: { type: Number, default: 0 },
  dueDate: { type: Date },
  status: { type: String, enum: ['Paid', 'Unpaid', 'Partial'], default: 'Unpaid' },
  notes: { type: String },
  
  // Payment History
  payments: [PaymentSchema],
  
  // Installment Plan
  hasInstallmentPlan: { type: Boolean, default: false },
  numberOfInstallments: { type: Number },
  installments: [InstallmentSchema],
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
FeeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Fee', FeeSchema);
