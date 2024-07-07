import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import aws from 'aws-sdk';
import moment from 'moment';

var inLineCss = require('nodemailer-juice');
const SESCredentials = {
    accessKeyId: process.env.accessKeyId,
    secretAccessKey: process.env.secretAccessKey,
    region: "eu-west-2"
}
const awsEmailAddress = "info@cheffie.co.uk"
// Customer SignUp Email implemented 4
export async function customerSignupEmail(email, name, link) {
    const filePath = path.join(__dirname, '../../src/utils/email_templates/Welcome.html');
    const source = fs.readFileSync(filePath, 'utf-8').toString();
    const template = handlebars.compile(source);
    const replacements = {
        name: name,
        link: link
    };
    const htmlToSend = template(replacements);
    let transporter = nodemailer.createTransport({
        // Credentials for user with SES access in AWS.
        SES: new aws.SES(SESCredentials),
    });
    transporter.use('compile', inLineCss());
    try {
        let transportera = await transporter.sendMail({
            from: awsEmailAddress,
            to: email,
            subject: "Welcome to Cheffie",
            html: htmlToSend,
        });
        console.log(transportera)
    } catch (error) {
        console.log(error)
    }
}
// Chef Onboarding Email
export async function chefAccounCreateEmail(email) {
    const filePath = path.join(__dirname, '../../src/utils/email_templates/chef-setup-wizard.html');
    const source = fs.readFileSync(filePath, 'utf-8').toString();
    const template = handlebars.compile(source);
    let link = process.env.CLIENT_URL + '/chef/sign-in';
    const replacements = {
        link
    };
    const htmlToSend = template(replacements);
    let transporter = nodemailer.createTransport({
        // Credentials for user with SES access in AWS.
        SES: new aws.SES(SESCredentials),
    });
    transporter.use('compile', inLineCss());
    try {
        let transportera = await transporter.sendMail({
            from: awsEmailAddress,
            to: email,
            subject: "Welcome to Cheffie",
            html: htmlToSend,
        });
        console.log(transportera)
    } catch (error) {
        console.log(error)
    }
}
// Reset Password Email implemented 3
export async function resetPasswordEmail(email, link) {
    const filePath = path.join(__dirname, '../../src/utils/email_templates/reset-password.html');
    const source = fs.readFileSync(filePath, 'utf-8').toString();
    const template = handlebars.compile(source);
    let client_url = process.env.CLIENT_URL + '/faqs/';
    const replacements = {
        link: link,
        client_url: client_url
    };
    const htmlToSend = template(replacements);
    let transporter = nodemailer.createTransport({
        // Credentials for user with SES access in AWS.
        SES: new aws.SES(SESCredentials),
    });
    transporter.use('compile', inLineCss());
    try {
        let transportera = await transporter.sendMail({
            from: awsEmailAddress,
            to: email,
            subject: "Cheffie: Reset Password",
            html: htmlToSend,
        });
        console.log(transportera)
    } catch (error) {
        console.log(error)
    }
}
// Update Password Email implemented 2
export async function updatePasswordEmail(email) {
    const filePath = path.join(__dirname, '../../src/utils/email_templates/reset-password-successful.html');
    const source = fs.readFileSync(filePath, 'utf-8').toString();
    const template = handlebars.compile(source);
    let link = process.env.CLIENT_URL + '/faqs/';
    const replacements = {
        name: '',
        link: link
    };
    const htmlToSend = template(replacements);
    let transporter = nodemailer.createTransport({
        // Credentials for user with SES access in AWS.
        SES: new aws.SES(SESCredentials),
    });
    transporter.use('compile', inLineCss());
    try {
        let transportera = await transporter.sendMail({
            from: awsEmailAddress,
            to: email,
            subject: "Your have successfully reset your password",
            html: htmlToSend,
        });
        console.log(transportera)
    } catch (error) {
        console.log(error)
    }
}
// Booking Email implemented 5
export async function bookingEmail(email, data, ref) {
    const filePath = path.join(__dirname, '../../src/utils/email_templates/booking-details.html');
    const source = fs.readFileSync(filePath, 'utf-8').toString();
    const template = handlebars.compile(source);
    const replacements = {
        name: data.name,
        ref: ref,
        phone: data.phone,
        email: data.email,
        date: data.date,
        time: data.time,
        people: data.people,
        houseNumber: data.houseNumber,
        street: data.street,
        postcode: data.postcode,
        chef: data.chef,
        menu: data.menu,
        cooker: data.cooker > 1 ? data.cooker + ' Hobs' : data.cooker + ' Hob',
        allergies: data.allergies?.split(',').length - 1 <= 1 ? data.allergies.replace(',', '') : data?.allergies?.replace(',', ', '),
        notes: data.notes,
        price: data.price,
        total: data.total,
        discount: data.percent_off ? (data.total * (data.percent_off / 100)) : 0,
        discountedTotal: data.percent_off ? data.total - (data.total * (data.percent_off / 100)) : data.total
    };
    const htmlToSend = template(replacements);
    let transporter = nodemailer.createTransport({
        // Credentials for user with SES access in AWS.
        SES: new aws.SES(SESCredentials),
    });
    transporter.use('compile', inLineCss());
    try {
        let transportera = await transporter.sendMail({
            from: awsEmailAddress,
            to: email,
            subject: "Cheffie Booking",
            html: htmlToSend,
        });
        console.log(transportera)
    } catch (error) {
        console.log(error)
    }
}
// Chef Updated Booking email implemented 1
export async function updateBookingEmail(data) {
    const filePath = path.join(__dirname, '../../src/utils/email_templates/updated-booking-details.html');
    const source = fs.readFileSync(filePath, 'utf-8').toString();
    const template = handlebars.compile(source);
    const replacements = {
        ref: data.ref,
    };
    const htmlToSend = template(replacements);
    let transporter = nodemailer.createTransport({
        // Credentials for user with SES access in AWS.
        SES: new aws.SES(SESCredentials),
    });
    transporter.use('compile', inLineCss());
    try {
        let transportera = await transporter.sendMail({
            from: awsEmailAddress,
            to: data.email,
            subject: "Your chef updated your booking",
            html: htmlToSend,
        });
        console.log(transportera)
    } catch (error) {
        console.log(error)
    }
}
// Chef or Customer Receive New Message Email 
export async function receiveNewMessage(ref, email) {
    console.log("Data: ", ref, email);
    const filePath = path.join(__dirname, '../../src/utils/email_templates/new-message.html');
    const source = fs.readFileSync(filePath, 'utf-8').toString();
    const template = handlebars.compile(source);
    const replacements = {
        ref: ref,
    };
    const htmlToSend = template(replacements);
    let transporter = nodemailer.createTransport({
        // Credentials for user with SES access in AWS.
        SES: new aws.SES(SESCredentials),
    });
    transporter.use('compile', inLineCss());
    try {
        let transportera = await transporter.sendMail({
            from: awsEmailAddress,
            to: email,
            subject: "New Message",
            html: htmlToSend,
        });
        console.log(transportera)
    }
    catch (error) {
        console.log(error)
    }
}
// Chef Account Approved Email
export async function chefAccountApproved(email, name, password) {
    const filePath = path.join(__dirname, '../../src/utils/email_templates/account-approved.html');
    const source = fs.readFileSync(filePath, 'utf-8').toString();
    const template = handlebars.compile(source);
    let link = process.env.CLIENT_URL + '/chef/sign-in';
    const replacements = {
        link: link,
        email: email,
        name: name,
        password: password
    };
    const htmlToSend = template(replacements);
    let transporter = nodemailer.createTransport({
        // Credentials for user with SES access in AWS.
        SES: new aws.SES(SESCredentials),
    });
    transporter.use('compile', inLineCss());
    try {
        let transportera = await transporter.sendMail({
            from: awsEmailAddress,
            to: email,
            subject: "Account Approved",
            html: htmlToSend,
        });
        console.log(transportera)
    }
    catch (error) {
        console.log(error)
    }
}
// Chef Account Live Email
export async function chefAccountLive(email) {
    const filePath = path.join(__dirname, '../../src/utils/email_templates/chef-profile-live.html');
    const source = fs.readFileSync(filePath, 'utf-8').toString();
    const template = handlebars.compile(source);
    let link = process.env.CLIENT_URL + '/chef/sign-in';
    const replacements = {
        link: link
    };
    const htmlToSend = template(replacements);
    let transporter = nodemailer.createTransport({
        // Credentials for user with SES access in AWS.
        SES: new aws.SES(SESCredentials),
    });
    transporter.use('compile', inLineCss());
    try {
        let transportera = await transporter.sendMail({
            from: awsEmailAddress,
            to: email,
            subject: "Account Is Live",
            html: htmlToSend,
        });
        console.log(transportera)
    }
    catch (error) {
        console.log(error)
    }
}
// Chef Account Hold Email
export async function chefAccountHold(email) {
    const filePath = path.join(__dirname, '../../src/utils/email_templates/chef-profile-hold.html');
    const source = fs.readFileSync(filePath, 'utf-8').toString();
    const template = handlebars.compile(source);
    const htmlToSend = template();
    let transporter = nodemailer.createTransport({
        // Credentials for user with SES access in AWS.
        SES: new aws.SES(SESCredentials),
    });
    transporter.use('compile', inLineCss());
    try {
        let transportera = await transporter.sendMail({
            from: awsEmailAddress,
            to: email,
            subject: "Account Is Hold",
            html: htmlToSend,
        });
        console.log(transportera)
    }
    catch (error) {
        console.log(error)
    }
}
// Chef Confirm Booking Email
export async function chefConfirmBooking(data, bookingData, otherData) {
    const filePath = path.join(__dirname, '../../src/utils/email_templates/confirm-booking.html');
    const source = fs.readFileSync(filePath, 'utf-8').toString();
    const template = handlebars.compile(source);
    const replacements = {
        ref: bookingData.dataValues.reference_id,
        name: otherData?.customerObject?.dataValues?.user?.dataValues?.full_name,
        phone: otherData?.customerObject?.dataValues?.user?.dataValues?.phone_numbers[0]?.dataValues?.national_number,
        email: otherData?.customerObject?.dataValues?.user?.dataValues?.email,
        date: moment(bookingData?.dataValues?.event_date).format('DD-MM-YYYY'),
        time: moment(bookingData?.dataValues?.event_date).format('h:mm a'),
        people: bookingData.dataValues.people_count,
        houseNumber: bookingData.dataValues.address,
        street: bookingData.dataValues.addressline2,
        postcode: bookingData.dataValues.postcode,
        chef: otherData?.chefObj?.dataValues?.user?.dataValues?.full_name,
        menu: otherData?.MenuObj?.dataValues?.name,
        cooker: otherData.CookerObj.name > 1 ? otherData.CookerObj.name + ' Hobs' : otherData.CookerObj.name + ' Hob',
        allergies: bookingData?.dataValues?.allergies.map(item => item.dataValues.name.split(',').length - 1 <= 1 ? item.dataValues.name.replace(',', '') : item.dataValues.name.replace(',', ', ')),
        notes: bookingData.dataValues.notes,
        price: data.price,
        total: data.total,
        // TODO:add discount fields
        discount: data.percent_off ? (data.total * (data.percent_off / 100)) : 0,
        discountedTotal: data.percent_off ? data.total - (data.total * (data.percent_off / 100)) : data.total
    };
    const htmlToSend = template(replacements);
    let transporter = nodemailer.createTransport({
        // Credentials for user with SES access in AWS.
        SES: new aws.SES(SESCredentials),
    });
    transporter.use('compile', inLineCss());
    try {
        let transportera = await transporter.sendMail({
            from: awsEmailAddress,
            to: otherData?.customerObject?.dataValues?.user?.dataValues?.email,
            subject: "Confirm Booking",
            html: htmlToSend,
        });
        console.log(transportera)
    } catch (error) {
        console.log(error)
    }
}
// Chef new booking email
export async function newBookingChefEmail(email, message, link) {
    const filePath = path.join(__dirname, '../../src/utils/email_templates/new-booking-message.html');
    const source = fs.readFileSync(filePath, 'utf-8').toString();
    const template = handlebars.compile(source);

    const replacements = {
        message,
        link
    };
    const htmlToSend = template(replacements);
    let transporter = nodemailer.createTransport({
        // Credentials for user with SES access in AWS.
        SES: new aws.SES(SESCredentials),
    });
    transporter.use('compile', inLineCss());
    try {
        let transportera = await transporter.sendMail({
            from: awsEmailAddress,
            to: email,
            subject: "New booking",
            html: htmlToSend,
        });
        console.log(transportera)
    } catch (error) {
        console.log(error)
    }
}
// Reminder Email For Chef And Customer
export async function chefReminderBookingEmail(data) {
    const filePath = path.join(__dirname, '../../src/utils/email_templates/upcoming-booking.html');
    const source = fs.readFileSync(filePath, 'utf-8').toString();
    const template = handlebars.compile(source);
    const replacements = {
        ...data
    };
    const htmlToSend = template(replacements);
    let transporter = nodemailer.createTransport({
        // Credentials for user with SES access in AWS.
        SES: new aws.SES(SESCredentials),
    });
    transporter.use('compile', inLineCss());
    try {
        let transporteraUser = await transporter.sendMail({
            from: awsEmailAddress,
            to: data.email,
            subject: "Booking Reminder",
            html: htmlToSend,
        });
        let transporteraChef = await transporter.sendMail({
            from: awsEmailAddress,
            to: data.chefEmail,
            subject: "Booking Reminder",
            html: htmlToSend,
        });
        console.log(transporteraUser, transporteraChef);
    } catch (error) {
        console.log(error)
    }
}
// Chef Outstanding Bookings Email
export async function outstandingBookingsEmail(data) {
    const filePath = path.join(__dirname, '../../src/utils/email_templates/outstanding-booking.html');
    const source = fs.readFileSync(filePath, 'utf-8').toString();
    const template = handlebars.compile(source);
    let link = process.env.CLIENT_URL + '/chef/sign-in';
    const replacements = {
        link: link
    };
    const htmlToSend = template(replacements);
    let transporter = nodemailer.createTransport({
        // Credentials for user with SES access in AWS.
        SES: new aws.SES(SESCredentials),
    });
    transporter.use('compile', inLineCss());
    try {
        let transportera = await transporter.sendMail({
            from: awsEmailAddress,
            to: data.email,
            subject: "Outstanding Bookings",
            html: htmlToSend,
        });
        console.log(transportera)
    }
    catch (error) {
        console.log(error)
    }
}

export async function sendEmail(email, subject, url) {
    // const filePath = path.join(__dirname, '../../src/utils/emailtemplates/password-reset.html');
    const filePath = path.join(__dirname, '../../src/utils/finaltemplates/updated-booking.html');
    const source = fs.readFileSync(filePath, 'utf-8').toString();
    const template = handlebars.compile(source);

    const replacements = {
        name: "Muhammad Shoaib",
    };
    const htmlToSend = template(replacements);

    const transporter = nodemailer.createTransport({
        host: "gmail",
        port: 2525, // 587
        secure: false,
        service: 'gmail',
        auth: {
            user: "chockwadi.shoaib@gmail.com",
            pass: "1647msiclb"
        }
    });
    transporter.use('compile', inLineCss());
    const mailOptions = {
        from: '<chockwadi.shoaib@gmail.com>',
        to: email,
        subject: subject,
        text: url,
        html: htmlToSend,
    };
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}
export async function forgetPasswordSendEmail(email, subject, text) {
    const transporter = nodemailer.createTransport({
        host: "gmail",
        port: 2525, // 587
        secure: false,
        service: 'gmail',
        auth: {
            user: "chockwadi.shoaib@gmail.com",
            pass: "1647msiclb"
        }
    });
    try {
        await transporter.sendMail({
            from: '<chockwadi.shoaib@gmail.com>',
            to: email,
            subject: subject,
            text: text,
        });
    }
    catch (e) {
        console.log(e)
    }

}