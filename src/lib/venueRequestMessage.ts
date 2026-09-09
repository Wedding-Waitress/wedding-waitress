export function venueRequestMessage(name:string,venue:string,room:string){return `Hello ${venue || '[Venue Name]'} team,

I'm using Wedding Waitress to plan my wedding and would appreciate an empty floor plan of the room booked for our reception: ${room || '[Room Name]'}.

Please use the upload link below to share the plan and add your venue's details. A layout showing the room boundaries, entrances and permanent features would help us organise our tables and reception setup.

You're also welcome to upload plans for your other event rooms. Please name each room clearly—sharing these will make planning easier for other couples celebrating at your venue.

Thank you for your help.

Kind regards,
${name || '[Your Name]'}`;}
