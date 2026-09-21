const templates = {
    reservation: ({ name, date, time, guests, code }) => `
        <div style="font-family:'Inter',sans-serif;background:#0a0604;color:#f5f0e8;padding:40px;max-width:600px;margin:0 auto">
            <div style="text-align:center;border-bottom:1px solid #d4793a;padding-bottom:30px;margin-bottom:30px">
                <h1 style="font-family:'Cormorant Garamond',serif;font-size:48px;letter-spacing:0.1em;margin:0">EMBER & OAK</h1>
                <p style="color:#d4793a;letter-spacing:0.3em;font-size:12px;margin-top:10px">FARM. FIRE. FORKED.</p>
            </div>
            <h2 style="font-family:'Cormorant Garamond',serif;font-weight:400">Welcome, ${name}.</h2>
            <p style="color:#a89888;line-height:1.7">Your reservation has been received and is being prepared by our team.</p>
            <div style="background:#1a1009;border:1px solid rgba(245,240,232,0.1);border-radius:8px;padding:30px;margin:30px 0">
                <table style="width:100%">
                    <tr><td style="padding:8px 0;color:#a89888;font-size:12px;text-transform:uppercase;letter-spacing:0.2em">Confirmation</td>
                        <td style="text-align:right;font-family:'Cormorant Garamond',serif;color:#d4793a;font-size:18px">${code}</td></tr>
                    <tr><td style="padding:8px 0;color:#a89888;font-size:12px;text-transform:uppercase;letter-spacing:0.2em">Date</td>
                        <td style="text-align:right">${date}</td></tr>
                    <tr><td style="padding:8px 0;color:#a89888;font-size:12px;text-transform:uppercase;letter-spacing:0.2em">Time</td>
                        <td style="text-align:right">${time}</td></tr>
                    <tr><td style="padding:8px 0;color:#a89888;font-size:12px;text-transform:uppercase;letter-spacing:0.2em">Guests</td>
                        <td style="text-align:right">${guests}</td></tr>
                </table>
            </div>
            <p style="color:#a89888;line-height:1.7">We look forward to welcoming you. Should you need to modify your reservation, please reference confirmation code <strong>${code}</strong>.</p>
            <div style="text-align:center;margin-top:40px;padding-top:30px;border-top:1px solid rgba(245,240,232,0.1);color:#a89888;font-size:12px">
                <p>1247 Vineyard Lane, Napa Valley, CA 94558</p>
                <p>+1 (707) 555-0189 · reserve@emberoak.com</p>
            </div>
        </div>
    `,
    welcome: (name) => `
        <div style="font-family:'Inter',sans-serif;background:#0a0604;color:#f5f0e8;padding:40px;max-width:600px;margin:0 auto;text-align:center">
            <h1 style="font-family:'Cormorant Garamond',serif;font-size:48px;letter-spacing:0.1em">EMBER & OAK</h1>
            <h2 style="font-family:'Cormorant Garamond',serif;font-weight:400;margin-top:40px">Welcome, ${name || 'Friend'}.</h2>
            <p style="color:#a89888;line-height:1.7;margin:20px 0">You've joined the inner circle. Expect stories from the kitchen, seasonal menus, and exclusive event invitations.</p>
            <a href="https://emberoak.com" style="display:inline-block;background:#d4793a;color:#0a0604;padding:14px 32px;border-radius:50px;text-decoration:none;margin-top:20px;font-weight:600;letter-spacing:0.1em">Visit Us</a>
        </div>
    `
};

module.exports = templates;
