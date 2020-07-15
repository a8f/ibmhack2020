"""
Generates the files needed to train a model on Watson Visual Recognition
Requires aff_wild_annotations_bboxes_landmarks_new to exist in the working directory
(download from https://drive.google.com/file/d/1A6uU4XdO11o_VYSV5RCGiwCb9l4Wgk4s)
"""
import cv2
import shutil
import os

try:
    from tqdm import tqdm
except ImportError:

    def tqdm(it):
        return it


BASE_PATH = "./aff_wild_annotations_bboxes_landmarks_new"
BASE_TGZ_PATH = BASE_PATH + ".tar.gz"
ANNOTATION_PATH = BASE_PATH + "/annotations/train"
ANNOTATION_TGZ_PATH = ANNOTATION_PATH + ".tar.gz"
BBOX_PATH = BASE_PATH + "/bboxes/train/train"
BBOX_TGZ_PATH = BBOX_PATH + ".tar.gz"
VIDEO_PATH = BASE_PATH + "/videos/train/train"
VIDEO_TGZ_PATH = VIDEO_PATH + ".tar.gz"
OUT_PATH = "images"
ZIP_OUT_PATH = "out"

CLASSES = [
    "excited",
    "happy",
    "relaxed",
    "interested",
    "neutral",
    "upset",
    "surprised",
    "sad",
    "angry"
]

# If True then delete the contents of output directories before starting
CLEAN_OUT_DIRS = True
# If True then make zip folders of the output categories
MAKE_ZIPS = False


def run():
    print("Extracting files and making output directories")
    extract_files()
    make_out_dirs()
    print("Getting and classifying frames")
    for videofile in tqdm(os.listdir(VIDEO_PATH)[:1]):
        number = videofile.rsplit(".", 1)
        if len(number) == 0:
            print("Skipping " + videofile)
        number = int(number[0])
        make_images(number)
    if MAKE_ZIPS:
        make_zips()
    print("Done")


def make_zips():
    if not os.path.exists(ZIP_OUT_PATH):
        os.mkdir(ZIP_OUT_PATH)
    print("\nZipping results")
    for cls in tqdm(CLASSES):
        shutil.make_archive(ZIP_OUT_PATH + "/" + cls, "zip", OUT_PATH + "/" + cls)


def bbox(number, frame):
    try:
        with open(BBOX_PATH + "/%d/%d.pts" % (number, frame), "r") as f:
            lines = f.readlines()
            if len(lines) != 8:
                return None
            if lines[0] != "version: 1\n" or lines[1] != "n_points: 4\n":
                return None
            # TODO normalize image sizes
            coords = list(
                map(
                    lambda x: list(
                        map(lambda p: int(float(p)), x.lstrip().rstrip().split(" "))
                    ),
                    lines[3:7],
                )
            )
            xs = sorted(coords, key=lambda x: x[0])
            ys = sorted(coords, key=lambda x: x[1])
            return [[xs[0][0], xs[3][0]], [ys[0][1], ys[3][1]]]
    except FileNotFoundError:
        return None


def make_images(number):
    arousal = open(ANNOTATION_PATH + "/arousal/%d.txt" % number, "r")
    valence = open(ANNOTATION_PATH + "/valence/%d.txt" % number, "r")
    video = cv2.VideoCapture(VIDEO_PATH + "/%d.avi" % number)
    more, frame = video.read()
    i = 1
    while more:
        box = bbox(number, i)
        if box is not None:
            a = float(arousal.readline().rstrip())
            v = float(valence.readline().rstrip())
            true_class = get_class(a, v)
            cv2.imwrite(
                "%s/%s/%d-%d.png" % (OUT_PATH, true_class, number, i),
                frame[box[1][0] : box[1][1], box[0][0] : box[0][1]],
            )
        more, frame = video.read()
        i += 1
    arousal.close()
    valence.close()


def make_out_dirs():
    if CLEAN_OUT_DIRS and os.path.exists(OUT_PATH):
        shutil.rmtree(OUT_PATH)
    if not os.path.exists(OUT_PATH):
        os.mkdir(OUT_PATH)
    for cls in CLASSES:
        path = OUT_PATH + "/" + cls
        if not os.path.exists(path):
            os.mkdir(path)


# Reference https://csdl-images.computer.org/trans/ta/2012/02/figures/tta20120202371.gif
def get_class(arousal, valence):
    if valence > 0.5:
        if arousal > 0.5:
            return "excited"
        elif arousal > 0.33:
            return "surprised"
        else:
            return "relaxed"
    elif valence > 0.25:  # positive
        if arousal > 0.5:
            return "interested"
        elif arousal > 0.33:
            return "concerned"
        else:
            return "relaxed"
    elif valence > -0.1:
        return "neutral"
    else:  # negative
        if arousal > 0.5:
            return "upset"
        elif arousal > 0.1:
            return "angry"
        else:
            return "sad"


def extract_files():
    if not os.path.exists(BASE_PATH):
        print("Extracting " + BASE_TGZ_PATH)
        if not os.path.exists(BASE_TGZ_PATH):
            print(BASE_TGZ_PATH + " doesn't exist")
            exit(1)
        shutil.unpack_archive(BASE_TGZ_PATH, BASE_PATH)
    if not os.path.exists(ANNOTATION_PATH):
        print("Extracting annotations")
        if not os.path.exists(ANNOTATION_TGZ_PATH):
            print("Annotations file " + ANNOTATION_TGZ_PATH + " doesn't exist")
            exit(1)
        shutil.unpack_archive(ANNOTATION_TGZ_PATH, ANNOTATION_PATH)
    if not os.path.exists(VIDEO_PATH):
        print("Extracting videos")
        if not os.path.exists(VIDEO_TGZ_PATH):
            print("Videos file " + VIDEO_TGZ_PATH + " doesn't exist")
            exit(1)
        shutil.unpack_archive(VIDEO_TGZ_PATH, VIDEO_PATH)
    if not os.path.exists(BBOX_PATH):
        print("Extracting bounding boxes")
        if not os.path.exists(BBOX_TGZ_PATH):
            print("Bounding box file " + BBOX_TGZ_PATH + " doesn't exist")
            exit(1)
        shutil.unpack_archive(BBOX_TGZ_PATH, BBOX_PATH)


if __name__ == "__main__":
    run()
