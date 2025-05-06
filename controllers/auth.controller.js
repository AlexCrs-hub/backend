const User = require('../models/user.model');
const bcrypt = require('bcryptjs');
const { generateTokenAndSetCookie } = require('../utils/generateTokenAndSetCookie');
const { sendVerificationEmail } = require('../mailtrap/emails');
const { sendWelcomeEmail } = require('../mailtrap/emails');
const { sendPasswordResetEmail } = require('../mailtrap/emails');
const { sendResetSuccessEmail } = require('../mailtrap/emails');
const crypto = require('crypto');

exports.signup = async (req, res) => {
    const { email, password, name } = req.body;

    try {
        if (!email || !password || !name) {
            throw new Error('All fields are required.');
        }
 
       const userAlreadyExists = await User.findOne({ email });
        if (userAlreadyExists) {
            return res.status(400).json({success: false, message: 'User already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
        const user = new User({ 
            email, 
            password: hashedPassword, 
            name,
            verificationToken,
            verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hour
        });

        await user.save();

        generateTokenAndSetCookie(res, user._id);

        //await sendVerificationEmail(user.email, user.verificationToken);

        return res.status(201).json({
            success: true, 
            message: 'User created successfully.',
            user: {
                ...user._doc,
                password: undefined
            }
            });

    } catch (error) {
        return res.status(400).json({success: false, message: error.message });
    }
}

exports.verifyEmail = async (req, res) => {
    const { code } = req.body;
	try {
		const user = await User.findOne({
			verificationToken: code,
			verificationTokenExpiresAt: { $gt: Date.now() },
		});

		if (!user) {
			return res.status(400).json({ success: false, message: "Invalid or expired verification code" });
		}

		user.isVerified = true;
		user.verificationToken = undefined;
		user.verificationTokenExpiresAt = undefined;
		await user.save();

		await sendWelcomeEmail(user.email, user.name);

		res.status(200).json({
			success: true,
			message: "Email verified successfully",
			user: {
				...user._doc,
				password: undefined,
			},
		});
	} catch (error) {
		console.log("error in verifyEmail ", error);
		res.status(500).json({ success: false, message: "Server error" });
	}
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({success: false, message: 'Invalid email or password.' });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({success: false, message: 'Invalid email or password.' });
        }

        generateTokenAndSetCookie(res, user._id);

        user.lastLogin = Date.now();
        await user.save();

        return res.status(200).json({
            success: true, 
            message: 'User logged in successfully.',
            user: {
                ...user._doc,
                password: undefined
            }
        });
    } catch (error) {
        return res.status(400).json({success: false, message: error.message });
    }
};

exports.logout = async (req, res) => {
    res.clearCookie('token');
    return res.status(200).json({success: true, message: 'User logged out successfully.' });
}

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({success: false, message: 'User not found.' });
        }

        // Generate a password reset token
        const resetToken = crypto.randomBytes(20).toString('hex');
        const resetTokenExpiresAt = Date.now() + 1 * 60 * 60 * 1000; // 1 hour  
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpiresAt = resetTokenExpiresAt;

        await user.save();
        console.log('resetToken', resetToken);

        // Send email
        await sendPasswordResetEmail(user.email, `${process.env.CLIENT_URL}/reset-password/${resetToken}`);

        return res.status(200).json({success: true, message: 'Password reset link sent to your email.' });
    } catch (error) {
        return res.status(400).json({success: false, message: error.message });
    }
};

exports.resetPassword = async (req, res) => {
	try {
		const { token } = req.params;
		const { password } = req.body;

		const user = await User.findOne({
			resetPasswordToken: token,
			resetPasswordExpiresAt: { $gt: Date.now() },
		});

		if (!user) {
			return res.status(400).json({ success: false, message: "Invalid or expired reset token" });
		}

		// update password
		const hashedPassword = await bcrypt.hash(password, 10);

		user.password = hashedPassword;
		user.resetPasswordToken = undefined;
		user.resetPasswordExpiresAt = undefined;
		await user.save();

		await sendResetSuccessEmail(user.email);

		res.status(200).json({ success: true, message: "Password reset successful" });
	} catch (error) {
		console.log("Error in resetPassword ", error);
		res.status(400).json({ success: false, message: error.message });
	}
};

exports.checkAuth = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        if (!user) {
            return res.status(400).json({success: false, message: 'User not found.' });
        }
        return res.status(200).json({success: true, user });
    } catch (error) {
        return res.status(400).json({success: false, message: error.message });
    }
};