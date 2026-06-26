// Hospital API System

// Patients
const patients = [
  { id: 1, name: "Rahul", phone: "9876543210" },
  { id: 2, name: "Priya", phone: "9876501234" }
];

// Doctors
const doctors = [
  {
    id: 1,
    name: "Dr. Kumar",
    specialization: "Cardiologist",
    slots: [
      { time: "09:00", isBooked: false },
      { time: "10:00", isBooked: false }
    ]
  },
  {
    id: 2,
    name: "Dr. Meena",
    specialization: "Dermatologist",
    slots: [
      { time: "11:00", isBooked: false },
      { time: "12:00", isBooked: false }
    ]
  }
];

// Appointments
const appointments = [
  {
    id: 1,
    patientId: 1,
    doctorId: 1,
    date: "2026-07-10",
    time: "09:00",
    status: "Upcoming"
  }
];

// Custom Error Classes
class NotFoundError extends Error {
  constructor(type, id) {
    super(`${type} with ID ${id} not found`);
    this.statusCode = 404;
  }
}

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 400;
  }
}

class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 409;
  }
}

class UnauthorizedError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 401;
  }
}

class PaymentError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 402;
  }
}


// Fake API Functions
function fetchPatient(id) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const patient = patients.find(p => p.id === id);

      if (patient) {
        resolve(patient);
      } else {
        reject(new NotFoundError("Patient", id));
      }

    }, 500);
  });
}

function fetchDoctor(id) {
  return new Promise((resolve, reject) => {

    setTimeout(() => {

      const doctor = doctors.find(d => d.id === id);

      if (doctor) {
        resolve(doctor);
      } else {
        reject(new NotFoundError("Doctor", id));
      }

    }, 500);

  });
}

function fetchAppointments(patientId) {

  return new Promise(resolve => {

    setTimeout(() => {

      const data = appointments.filter(a => a.patientId === patientId);

      resolve(data);

    }, 500);

  });

}

function createAppointment(data) {

  return new Promise(resolve => {

    setTimeout(() => {

      data.id = appointments.length + 1;

      appointments.push(data);

      resolve(data);

    }, 500);

  });

}

// Patient Dashboard
async function getPatientDashboard(patientId) {

  const patient = await fetchPatient(patientId);

  const patientAppointments = await fetchAppointments(patientId);

  const appointmentDetails = [];

  for (const appointment of patientAppointments) {

    const doctor = await fetchDoctor(appointment.doctorId);

    appointmentDetails.push({
      date: appointment.date,
      time: appointment.time,
      doctor: {
        name: doctor.name,
        specialization: doctor.specialization
      },
      status: appointment.status
    });

  }

  const stats = {
    total: appointmentDetails.length,
    upcoming: appointmentDetails.filter(a => a.status === "Upcoming").length,
    completed: appointmentDetails.filter(a => a.status === "Completed").length
  };

  return {
    patient: {
      name: patient.name,
      phone: patient.phone
    },
    appointments: appointmentDetails,
    stats
  };

}

// Book Appointment
async function bookAppointment(patientId, doctorId, date, time) {

  const missing = [];

  if (!patientId) missing.push("patientId");
  if (!doctorId) missing.push("doctorId");
  if (!date) missing.push("date");
  if (!time) missing.push("time");

  if (missing.length > 0) {
    throw new ValidationError("Missing fields: " + missing.join(", "));
  }

  if (new Date(date) < new Date()) {
    throw new ValidationError("Cannot book appointments in the past");
  }

  const patient = await fetchPatient(patientId);

  const doctor = await fetchDoctor(doctorId);

  const slot = doctor.slots.find(s => s.time === time);

  if (!slot) {
    throw new ValidationError("Invalid slot");
  }

  if (slot.isBooked) {
    throw new ConflictError(`Slot ${time} is already booked`);
  }

  slot.isBooked = true;

  const appointment = await createAppointment({
    patientId,
    doctorId,
    date,
    time,
    status: "Upcoming"
  });

  return appointment;

}

// Payment
function paymentAttempt(amount, method) {

  return new Promise((resolve, reject) => {

    setTimeout(() => {

      if (Math.random() < 0.7) {

        resolve({
          status: "paid",
          amount,
          method,
          transactionId: "TXN-" + Date.now()
        });

      } else {

        reject(new PaymentError("Payment Declined"));

      }

    }, 500);

  });

}

async function processPayment(appointmentId, amount, method) {

  try {

    return await paymentAttempt(amount, method);

  } catch {

    console.log("Retrying Payment...");

    return await paymentAttempt(amount, method);

  }

}

// Complete Booking Flow
async function completeBookingFlow(
  patientId,
  doctorId,
  date,
  time,
  paymentMethod
) {

  try {

    const appointment = await bookAppointment(
      patientId,
      doctorId,
      date,
      time
    );

    const payment = await processPayment(
      appointment.id,
      500,
      paymentMethod
    );

    return {
      message: "Booking Successful",
      appointment,
      payment
    };

  } catch (error) {

    const index = appointments.findIndex(
      a =>
        a.patientId === patientId &&
        a.doctorId === doctorId &&
        a.date === date &&
        a.time === time
    );

    if (index !== -1) {

      appointments.splice(index, 1);

      const doctor = doctors.find(d => d.id === doctorId);

      if (doctor) {

        const slot = doctor.slots.find(s => s.time === time);

        if (slot) {
          slot.isBooked = false;
        }

      }

    }

    return {
      message: "Booking Failed",
      error: error.message
    };

  }

}

// Multiple Dashboards
async function getDashboardForMultiplePatients(patientIds) {

  return Promise.all(

    patientIds.map(id => getPatientDashboard(id))

  );

}

// Tests
async function runTests() {

  console.log("------ Existing Patient ------");

  try {

    console.log(await fetchPatient(1));

  } catch (error) {

    console.log(error.message);

  }


  console.log("\n------ Non Existing Patient ------");

  try {

    console.log(await fetchPatient(10));

  } catch (error) {

    console.log(error.message);

  }


  console.log("\n------ Happy Booking ------");

  console.log(

    await completeBookingFlow(
      2,
      2,
      "2026-07-15",
      "11:00",
      "UPI"
    )

  );


  console.log("\n------ Already Booked ------");

  console.log(

    await completeBookingFlow(
      2,
      2,
      "2026-07-15",
      "11:00",
      "UPI"
    )

  );


  console.log("\n------ Bad Patient ------");

  console.log(

    await completeBookingFlow(
      20,
      1,
      "2026-07-20",
      "10:00",
      "Card"
    )

  );


  console.log("\n------ Dashboard ------");

  console.log(await getPatientDashboard(1));


  console.log("\n------ Multiple Dashboards ------");

  console.log(await getDashboardForMultiplePatients([1, 2]));


  console.log("\n------ Run Booking Flow 5 Times ------");

  for (let i = 1; i <= 5; i++) {

    console.log(

      await completeBookingFlow(
        1,
        1,
        `2026-08-0${i}`,
        "10:00",
        "Card"
      )

    );

    doctors[0].slots.find(s => s.time === "10:00").isBooked = false;

  }

}

runTests();