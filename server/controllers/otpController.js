import { transporter } from "../config/mail.js";
import { generateOTP } from "../utils/otp.js";
import { otpStore } from "../utils/otpStore.js";

export const sendOtp = async (req, res) => {
    try {
        const { email } = req.body;
        const otp = generateOTP();

        // Store OTP in memory for 5 min
        otpStore[email] = {
            otp,
            expiresAt: Date.now() + 5 * 60 * 1000
        };

        // Send via Gmail
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Your PixelPatch OTP Code",
            text: `Your one-time password is: ${otp}`,
        });

        return res.json({ message: "OTP sent" });
    } catch (err) {
        console.error("OTP SEND ERROR:", err);
        return res.status(500).json({ error: "Failed to send OTP" });
    }
};

export const verifyOtp = (req, res) => {
    const { email, otp } = req.body;

    const record = otpStore[email];

    if (!record) return res.status(400).json({ error: "No OTP found" });
    if (Date.now() > record.expiresAt)
        return res.status(400).json({ error: "OTP expired" });
    if (otp !== record.otp)
        return res.status(400).json({ error: "Invalid OTP" });

    delete otpStore[email];
    return res.json({ message: "OTP verified" });
};
