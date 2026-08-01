import { Modal } from "@/components/common/modals/Modal";
import { RandomPicker, type RandomPickerProps } from "./RandomPicker";

interface RandomPickerModalProps extends RandomPickerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RandomPickerModal({
  isOpen,
  onOpenChange,
  title,
  description,
  ...pickerProps
}: RandomPickerModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      className="max-h-[calc(100vh-2rem)] overflow-y-auto border-white/15 bg-[#12040f] p-6 text-white sm:max-w-3xl"
    >
      <Modal.Header title={title} description={description} />
      <Modal.Content className="min-w-0">
        <RandomPicker
          title={title}
          description={description}
          {...pickerProps}
          showHeading={false}
          className="rounded-none border-0 bg-transparent p-0"
        />
      </Modal.Content>
    </Modal>
  );
}
