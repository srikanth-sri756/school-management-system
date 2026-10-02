const express = require('express');
const router = express.Router();
const Fee = require('../models/Fee');
const Student = require('../models/Student');
const Class = require('../models/Class');
const ExcelJS = require('exceljs');

// List all fees
router.get('/', async (req, res) => {
  const fees = await Fee.find().populate('student');
  res.render('fees/list', { fees, user: req.session.user, page: 'fees' });
});

// Add fee form
router.get('/add', async (req, res) => {
  const students = await Student.find().populate('class');
  const classes = await Class.find().sort({ name: 1 });
  res.render('fees/add', { students, classes, user: req.session.user, page: 'fees' });
});

// Add fee POST
router.post('/add', async (req, res) => {
  try {
    const { student, term, amount, dueDate, notes, paymentType, numberOfInstallments, firstInstallmentDate, installmentFrequency } = req.body;
    
    const feeData = {
      student,
      term,
      amount: parseFloat(amount),
      notes
    };

    if (paymentType === 'installment' && numberOfInstallments && firstInstallmentDate) {
      // Create installment plan
      feeData.hasInstallmentPlan = true;
      feeData.numberOfInstallments = parseInt(numberOfInstallments);
      feeData.installments = [];

      const totalAmount = parseFloat(amount);
      const numInstallments = parseInt(numberOfInstallments);
      const installmentAmount = parseFloat((totalAmount / numInstallments).toFixed(2));
      const lastInstallmentAmount = parseFloat((totalAmount - (installmentAmount * (numInstallments - 1))).toFixed(2));

      // Calculate month gap based on frequency
      let monthsGap = 1; // monthly
      if (installmentFrequency === 'bimonthly') monthsGap = 2;
      if (installmentFrequency === 'quarterly') monthsGap = 3;

      let currentDate = new Date(firstInstallmentDate);

      for (let i = 1; i <= numInstallments; i++) {
        const installment = {
          installmentNumber: i,
          amount: i === numInstallments ? lastInstallmentAmount : installmentAmount,
          dueDate: new Date(currentDate),
          paidAmount: 0,
          status: 'Pending'
        };
        
        feeData.installments.push(installment);
        currentDate.setMonth(currentDate.getMonth() + monthsGap);
      }

      // Set main due date to first installment date
      feeData.dueDate = new Date(firstInstallmentDate);
      feeData.status = 'Unpaid';
    } else {
      // Single payment
      feeData.hasInstallmentPlan = false;
      feeData.dueDate = dueDate;
      feeData.status = 'Unpaid';
    }

    await Fee.create(feeData);
    req.flash('success', 'Fee record created successfully!');
    res.redirect('/fees');
  } catch (error) {
    console.error('Error creating fee:', error);
    req.flash('error', 'Error creating fee record');
    res.redirect('/fees/add');
  }
});

// Edit fee
router.get('/:id/edit', async (req, res) => {
  const fee = await Fee.findById(req.params.id).populate('student');
  const students = await Student.find();
  res.render('fees/edit', { fee, students, user: req.session.user, page: 'fees' });
});

router.post('/:id/edit', async (req, res) => {
  const { student, term, amount, dueDate, paid, status, notes } = req.body;
  await Fee.findByIdAndUpdate(req.params.id, { student, term, amount, dueDate, paid, status, notes });
  res.redirect('/fees');
});

// Delete fee
router.post('/:id/delete', async (req, res) => {
  await Fee.findByIdAndDelete(req.params.id);
  res.redirect('/fees');
});

// Export fees to Excel
router.get('/export', async (req, res) => {
  try {
    const fees = await Fee.find()
      .populate('student')
      .sort({ dueDate: 1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Fees Report');

    // Define columns
    worksheet.columns = [
      { header: 'Roll Number', key: 'rollNumber', width: 15 },
      { header: 'Student Name', key: 'studentName', width: 25 },
      { header: 'Class', key: 'class', width: 15 },
      { header: 'Fee Term', key: 'term', width: 20 },
      { header: 'Total Amount', key: 'amount', width: 15 },
      { header: 'Paid Amount', key: 'paid', width: 15 },
      { header: 'Balance', key: 'balance', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Due Date', key: 'dueDate', width: 15 },
      { header: 'Notes', key: 'notes', width: 30 }
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // Add data rows
    fees.forEach(fee => {
      const balance = (fee.amount || 0) - (fee.paid || 0);
      worksheet.addRow({
        rollNumber: fee.student ? fee.student.rollNumber : 'N/A',
        studentName: fee.student ? `${fee.student.firstName} ${fee.student.lastName}` : 'N/A',
        class: fee.student ? fee.student.class : 'N/A',
        term: fee.term,
        amount: fee.amount,
        paid: fee.paid || 0,
        balance: balance,
        status: fee.status,
        dueDate: fee.dueDate ? new Date(fee.dueDate).toLocaleDateString('en-IN') : 'N/A',
        notes: fee.notes || ''
      });
    });

    // Apply borders and alignment to all cells
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        if (rowNumber > 1) {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      });
    });

    // Generate filename with current date
    const date = new Date().toLocaleDateString('en-IN').replace(/\//g, '-');
    const filename = `Fees_Report_${date}.xlsx`;

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting fees:', error);
    res.status(500).send('Error exporting fees data');
  }
});

// View installment details
router.get('/:id/installments', async (req, res) => {
  try {
    const fee = await Fee.findById(req.params.id)
      .populate({
        path: 'student',
        populate: { path: 'class' }
      });
    
    if (!fee) {
      req.flash('error', 'Fee record not found');
      return res.redirect('/fees');
    }

    if (!fee.hasInstallmentPlan) {
      req.flash('error', 'This fee does not have an installment plan');
      return res.redirect('/fees');
    }

    res.render('fees/installments', { fee, user: req.session.user, page: 'fees' });
  } catch (error) {
    console.error('Error viewing installments:', error);
    req.flash('error', 'Error loading installment details');
    res.redirect('/fees');
  }
});

// Record installment payment
router.post('/:id/pay-installment', async (req, res) => {
  try {
    const { installmentIndex, paymentAmount, paymentDate, paymentNotes } = req.body;
    const fee = await Fee.findById(req.params.id);
    
    if (!fee) {
      req.flash('error', 'Fee record not found');
      return res.redirect('/fees');
    }

    const installment = fee.installments[installmentIndex];
    if (!installment) {
      req.flash('error', 'Installment not found');
      return res.redirect(`/fees/${req.params.id}/installments`);
    }

    const payment = parseFloat(paymentAmount);
    const newPaidAmount = installment.paidAmount + payment;

    // Update installment
    installment.paidAmount = newPaidAmount;
    installment.paidDate = paymentDate;
    
    if (paymentNotes) {
      installment.notes = installment.notes 
        ? `${installment.notes}\n[${new Date().toLocaleDateString()}] ${paymentNotes}`
        : paymentNotes;
    }

    // Update installment status
    if (newPaidAmount >= installment.amount) {
      installment.status = 'Paid';
    } else if (newPaidAmount > 0) {
      installment.status = 'Partial';
    }

    // Update total fee paid amount
    fee.paid = fee.installments.reduce((sum, inst) => sum + inst.paidAmount, 0);

    // Update overall fee status
    if (fee.paid >= fee.amount) {
      fee.status = 'Paid';
    } else if (fee.paid > 0) {
      fee.status = 'Partial';
    }

    await fee.save();

    req.flash('success', `Payment of ₹${payment.toLocaleString('en-IN')} recorded successfully`);
    res.redirect(`/fees/${req.params.id}/installments`);
  } catch (error) {
    console.error('Error recording payment:', error);
    req.flash('error', 'Error recording payment');
    res.redirect(`/fees/${req.params.id}/installments`);
  }
});

module.exports = router;
