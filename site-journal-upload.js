(function(root, factory) {
  var domain = typeof module === 'object' && module.exports ? require('./site-journal-domain.js') : root.DAHAM_SITE_JOURNAL;
  var api = factory(domain);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.DAHAM_SITE_JOURNAL_UPLOAD = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(domain) {
  'use strict';

  var RESUMABLE_THRESHOLD = 6 * 1024 * 1024;

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function makeId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    var hex = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
    return hex.replace(/[xy]/g, function(char) {
      var value = Math.floor(Math.random() * 16);
      return (char === 'x' ? value : (value & 3) | 8).toString(16);
    });
  }

  function makeAbortController() {
    if (typeof AbortController !== 'undefined') return new AbortController();
    var listeners = [];
    var signal = {
      aborted: false,
      addEventListener: function(type, listener) { if (type === 'abort') listeners.push(listener); }
    };
    return {
      signal: signal,
      abort: function() {
        if (signal.aborted) return;
        signal.aborted = true;
        listeners.slice().forEach(function(listener) { listener(); });
      }
    };
  }

  function errorDetails(error) {
    if (error && typeof error === 'object') return { code: clean(error.code), message: clean(error.message) || 'upload failed' };
    return { code: '', message: clean(error) || 'upload failed' };
  }

  function createUploadQueue(options) {
    options = options || {};
    if (!domain || typeof domain.validatePhoto !== 'function' || typeof domain.buildObjectPath !== 'function') throw new Error('site journal domain is unavailable');
    if (typeof options.uploadStandard !== 'function') throw new Error('uploadStandard is required');
    if (typeof options.uploadResumable !== 'function') throw new Error('uploadResumable is required');
    if (typeof options.saveMetadata !== 'function') throw new Error('saveMetadata is required');
    if (typeof options.removeObject !== 'function') throw new Error('removeObject is required');

    var concurrency = Number(options.concurrency == null ? 3 : options.concurrency);
    if (!Number.isInteger(concurrency) || concurrency < 1) throw new Error('concurrency must be a positive integer');
    var jobs = [];
    var listeners = [];
    var active = 0;
    var started = false;

    function publicJob(job) {
      var errorCode = job.errorCode;
      var error = job.error;
      if (job.reconciliationError) {
        if (error) error = Object.assign({}, error, { reconciliation: job.reconciliationError });
        else {
          errorCode = job.reconciliationError.code;
          error = job.reconciliationError;
        }
      }
      return {
        id: job.id,
        file: job.file,
        status: job.status,
        progress: job.progress,
        errorCode: errorCode,
        attempts: job.attempts,
        storagePath: job.storagePath,
        metadata: job.metadata,
        error: error
      };
    }

    function snapshot() {
      return jobs.map(publicJob);
    }

    function notify() {
      var state = snapshot();
      listeners.slice().forEach(function(listener) { listener(state); });
    }

    function setProgress(job, value, total) {
      if (job.status !== 'uploading') return;
      if (value && typeof value === 'object') {
        total = value.total;
        value = value.loaded == null ? value.progress : value.loaded;
      }
      var number = Number(value);
      var denominator = Number(total);
      if (Number.isFinite(denominator) && denominator > 0) number = (number / denominator) * 100;
      else if (number >= 0 && number <= 1) number *= 100;
      if (!Number.isFinite(number)) return;
      job.progress = Math.max(job.progress, Math.min(99, Math.round(number)));
      notify();
    }

    async function run(job) {
      active += 1;
      job.status = 'uploading';
      job.progress = 0;
      job.errorCode = null;
      job.error = null;
      job.attempts += 1;
      job.runId += 1;
      var runId = job.runId;
      var storagePath = job.storagePath;
      var metadata = Object.assign({}, job.metadata);
      var controller = makeAbortController();
      job.controller = controller;
      notify();

      var storageUploaded = false;
      var metadataStarted = false;

      async function cleanCancelledObject(metadataSaved) {
        if (!storageUploaded) return;
        var cleanupController = makeAbortController();
        var operation = metadataSaved ? 'remove_metadata' : 'remove_object';
        try {
          if (metadataSaved) {
            if (typeof options.removeMetadata !== 'function') throw Object.assign(new Error('removeMetadata is required for committed metadata cleanup'), { code: 'metadata_cleanup_unavailable' });
            await options.removeMetadata(metadata, cleanupController.signal);
            operation = 'remove_object';
          }
          await options.removeObject(storagePath, cleanupController.signal);
        } catch (cleanupError) {
          job.reconciliationError = {
            code: 'reconciliation_required',
            message: 'stale upload cleanup requires reconciliation',
            operation: operation,
            metadataId: clean(metadata.id),
            storagePath: storagePath,
            cleanup: errorDetails(cleanupError)
          };
          notify();
        }
      }

      async function removeUploadedObject() {
        var cleanupController = makeAbortController();
        await options.removeObject(storagePath, cleanupController.signal);
      }

      function isCurrentAttempt() {
        return job.runId === runId && job.status === 'uploading';
      }

      try {
        var uploader = Number(job.file.size) > RESUMABLE_THRESHOLD ? options.uploadResumable : options.uploadStandard;
        await uploader(job.file, storagePath, function(value, total) { setProgress(job, value, total); }, controller.signal);
        storageUploaded = true;
        if (!isCurrentAttempt()) { await cleanCancelledObject(); return; }
        if (!metadata.sha256 && typeof options.hashFile === 'function') {
          metadata.sha256 = await options.hashFile(job.file, controller.signal);
          if (!isCurrentAttempt()) { await cleanCancelledObject(); return; }
        }
        metadataStarted = true;
        var saved = await options.saveMetadata(metadata, controller.signal);
        if (!isCurrentAttempt()) { await cleanCancelledObject(true); return; }
        Object.assign(job.metadata, metadata, saved && typeof saved === 'object' ? saved : {});
        job.status = 'ready';
        job.progress = 100;
        notify();
      } catch (error) {
        if (!isCurrentAttempt()) { await cleanCancelledObject(metadataStarted); return; }
        var details = errorDetails(error);
        if (metadataStarted) {
          job.status = 'failed';
          job.errorCode = 'metadata_failed';
          job.error = { code: 'metadata_failed', message: details.message };
          try {
            await removeUploadedObject();
          } catch (cleanupError) {
            job.error.cleanup = errorDetails(cleanupError);
          }
        } else if (storageUploaded) {
          job.status = 'failed';
          job.errorCode = details.code || 'hash_failed';
          job.error = details;
          try {
            await removeUploadedObject();
          } catch (cleanupError) {
            job.error.cleanup = errorDetails(cleanupError);
          }
        } else if (details.code === 'aborted' || controller.signal.aborted) {
          job.status = 'cancelled';
          job.errorCode = 'cancelled';
          job.error = details;
        } else {
          job.status = 'failed';
          job.errorCode = details.code || 'upload_failed';
          job.error = details;
        }
        notify();
      } finally {
        active -= 1;
        if (job.controller === controller) job.controller = null;
        drain();
      }
    }

    function drain() {
      if (!started) return;
      while (active < concurrency) {
        var next = jobs.find(function(job) { return job.status === 'queued'; });
        if (!next) return;
        run(next);
      }
    }

    function add(files, context) {
      var list = Array.from(files || []);
      var baseCount = Number(context && (context.currentPhotoCount == null ? context.existingPhotoCount : context.currentPhotoCount));
      if (!Number.isFinite(baseCount)) baseCount = 0;
      // Validate every file before constructing a job, so a bad selection leaves no partial queue.
      list.forEach(function(file, index) { domain.validatePhoto(file, baseCount + index); });
      var added = list.map(function(file, index) {
        var photoId = makeId();
        var path = domain.buildObjectPath({
          companyId: context && context.companyId,
          projectId: context && context.projectId,
          journalId: context && context.journalId,
          photoId: photoId,
          originalName: file && file.name
        });
        var metadata = {
          id: photoId,
          companyId: context && context.companyId,
          journalId: context && context.journalId,
          storagePath: path,
          originalName: clean(file && file.name),
          mimeType: clean(file && file.type).toLowerCase(),
          byteSize: Number(file && file.size),
          status: 'ready',
          sortOrder: baseCount + index,
          createdBy: context && context.authorId
        };
        return {
          id: makeId(), file: file, status: 'queued', progress: 0, errorCode: null, attempts: 0,
          storagePath: path, metadata: metadata, error: null, reconciliationError: null, controller: null, runId: 0,
          pathContext: { companyId: context && context.companyId, projectId: context && context.projectId, journalId: context && context.journalId }
        };
      });
      jobs.push.apply(jobs, added);
      notify();
      drain();
      return added.map(publicJob);
    }

    function start() {
      started = true;
      drain();
      return snapshot();
    }

    function cancel(id) {
      var job = jobs.find(function(candidate) { return candidate.id === id; });
      if (!job || (job.status !== 'queued' && job.status !== 'uploading')) return false;
      job.runId += 1;
      if (job.status === 'queued') {
        job.status = 'cancelled';
        job.errorCode = 'cancelled';
        job.error = { code: 'cancelled', message: 'upload cancelled' };
      } else {
        job.status = 'cancelled';
        job.errorCode = 'cancelled';
        job.error = { code: 'cancelled', message: 'upload cancelled' };
        if (job.controller) job.controller.abort();
      }
      notify();
      drain();
      return true;
    }

    function retry(id) {
      var job = jobs.find(function(candidate) { return candidate.id === id; });
      if (!job || (job.status !== 'failed' && job.status !== 'cancelled')) return false;
      var photoId = makeId();
      job.storagePath = domain.buildObjectPath({
        companyId: job.pathContext.companyId,
        projectId: job.pathContext.projectId,
        journalId: job.pathContext.journalId,
        photoId: photoId,
        originalName: job.file && job.file.name
      });
      job.metadata.id = photoId;
      job.metadata.storagePath = job.storagePath;
      job.metadata.sha256 = null;
      job.status = 'queued';
      job.progress = 0;
      job.errorCode = null;
      job.error = null;
      notify();
      drain();
      return true;
    }

    function canFinalize() {
      return jobs.every(function(job) { return job.status === 'ready'; });
    }

    function intendedCount() {
      return jobs.filter(function(job) { return job.status === 'queued' || job.status === 'uploading' || job.status === 'ready'; }).length;
    }

    function subscribe(listener) {
      if (typeof listener !== 'function') throw new Error('listener must be a function');
      listeners.push(listener);
      listener(snapshot());
      return function() { listeners = listeners.filter(function(candidate) { return candidate !== listener; }); };
    }

    return { add: add, start: start, cancel: cancel, retry: retry, subscribe: subscribe, snapshot: snapshot, canFinalize: canFinalize, intendedCount: intendedCount };
  }

  return { createUploadQueue: createUploadQueue, RESUMABLE_THRESHOLD: RESUMABLE_THRESHOLD };
});

