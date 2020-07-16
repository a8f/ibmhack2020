# IBMHack2020

**Problem Addressed:**

With the rise of COVID-19 and the ensuing pandemic, many people have become reliant on online video conferencing for personal, educational, and professional purposes. However, we have all experienced calls where some people have video disabled or where there are too many users to keep track of everybody’s video.

This is where our new website, Emotion Detection With Intelligent Networks (EDWIN) comes in. It provides an easily readable interface that shows you how everyone feels without the need for monitoring each individual person’s video in the call. This could give digital conferences a new dimension by bringing emotions and reactions digitally, similar to the in-person queues one might pick up on. It also provides enhanced privacy for users who are not comfortable with sharing their camera in the call. They can simply enable their camera in the app and have their emotional feedback provided to the other participants without being visible.

**Solution Built:**

From a technical standpoint, EDWIN consists of

* A web frontend using just HTML, CSS, and Javascript for fast load times
* A server written in Javascript with Node.js and Express that provides a private REST API. The server uses IBM Cloudant for database storage.

**Problem Solved:**

With EDWIN, users can now see how people are emotionally and allow them to get an easy to read interface on the room’s feelings. This allows for the speakers to better “read the room” like they would if the presentation was in person. If the speaker mentions something, then they can see how the room feels about it, and take the speech course accordingly. For example: if a teacher is starting a new lesson, then he or she can quickly glance at the interface to see if the class is receiving the information well.

**Technology Used:**

At a high level the user would use and interact with EDWIN as follows:

1. User opens up EDWIN web interface
2. Creates a room
3. Invites others to join the room by sending them the unique link
4. Users in the room have the ability to enable/disable their emotion capture

Once a user joins a room, they are able to see the total number of people and the breakdown by emotion category. This information is periodically updated automatically by polling the REST API.

Users can also see a preview of their video feed and a graph of the emotion over time.

If a user chooses to enable their camera, frames are intermittently taken from the camera feed and sent to the REST API, which then sends the image to Watson Visual Recognition for emotion detection.


**Next Steps:**

This process uses a custom model trained on a few public datasets in order to classify emotion into one of 7 classes. Our results are promising, but they could be improved just by using a better dataset (for example, the AffectNet dataset); however, all of the most complete datasets in this area can only be accessed by requesting them from their creators, which takes time and is not always guaranteed.

Another small change that could cause a dramatic increase in accuracy would be adding an additional face-detection network before the emotion detection so that the most relevant part of the image is given to the emotion classifier.

From a user experience perspective, user research and user testing could greatly improve the overall look and feel of EDWIN.  By performing user research we can further understand the wants and needs of our users.  With usability testing we could identify the ease of use of the product.  We can then use this information to inform our overall design (UI and functionality) of EDWIN.
