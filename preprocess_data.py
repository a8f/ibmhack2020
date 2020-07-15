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
VIDEO_PATH = BASE_PATH + "/videos/train"
VIDEO_TGZ_PATH = VIDEO_PATH + ".tar.gz"
OUT_PATH = "images"

CLASSES = ["excited" "tense" "upset" "bored" "relaxed" "sad" "happy"]


def run():
    extract_files()
    for videofile in tqdm(os.listdir(VIDEO_PATH)[:1]):
        number = videofile.rsplit(".", 1)
        if len(number) == 0:
            print("Skipping " + videofile)
        number = number[0]
        make_images(number)


def bbox(number, frame):
    with open(BBOX_PATH + "/%d/%d.pts" % (number, frame), "r") as f:
        lines = f.readlines()
        if len(lines) != 8:
            return None
        if lines[0] != "version: 1\n" or lines[1] != "n_points: 4\n":
            return None
        # TODO normalize image sizes
        return map(lambda x: float(x.lstrip().rstrip()), lines[3:7])


def make_images(number):
    arousal = open(ANNOTATION_PATH + "/arousal/%d.txt" % number, "r")
    valence = open(ANNOTATION_PATH + "/valence/%d.txt" % number, "r")
    video = cv2.VideoCapture()
    i = 1
    more, frame = video.read()
    while more:
        box = bbox(number, i)
        if box is not None:
            a = float(arousal.readline().rstrip())
            v = float(valence.readline().rstrip())
            true_class = get_class(a, v)
            # TODO use bounding box
            cv2.imwrite("%s/%s/%d-%d.png" % (OUT_PATH, true_class, number, i), frame)
        more, frame = video.read()
        i += 1


def make_out_dirs():
    if not os.path.exists(OUT_PATH):
        os.mdir(OUT_PATH)
    for cls in CLASSES:
        path = OUT_PATH + "/" + cls
        if not os.path.exists(path):
            os.mkdir(path)


# Reference https://csdl-images.computer.org/trans/ta/2012/02/figures/tta20120202371.gif
def get_class(arousal, valence):
    if arousal > 0.6:  # high arousal
        if valence > 0:
            return "excited"
        else:
            return "tense"
    elif arousal > 0.4:  # neutral arousal
        if valence > 0:
            return "happy"
        else:
            return "sad"
    else:  # low arousal
        if valence > 0:
            return "relaxed"
        else:
            return "bored"


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
